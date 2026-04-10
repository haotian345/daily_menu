// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, data } = event

  switch (action) {
    case 'search':
      return await searchRecipes(data)
    case 'getDetail':
      return await getRecipeDetail(data)
    case 'initData':
      return await initData(data)
    case 'getCustomDetail':
      return await getCustomRecipeDetail(data)
    default:
      return { code: 400, msg: '未知操作' }
  }
}

/**
 * 搜索菜谱 - 根据食材和锅具匹配（同时搜索预设菜谱和用户自定义菜谱）
 */
async function searchRecipes(data) {
  const { ingredients = [], cookware = [], page = 1, pageSize = 20, openid = '' } = data

  try {
    // 获取所有预设菜谱
    const countResult = await db.collection('recipes').count()
    const total = countResult.total

    let allRecipes = []
    const batchTimes = Math.ceil(total / 100)
    for (let i = 0; i < batchTimes; i++) {
      const res = await db.collection('recipes')
        .skip(i * 100)
        .limit(100)
        .get()
      allRecipes = allRecipes.concat(res.data)
    }

    // 获取用户自定义菜谱
    try {
      const customCount = await db.collection('custom_recipes').count()
      const customTotal = customCount.total
      const customBatchTimes = Math.ceil(customTotal / 100)
      for (let i = 0; i < customBatchTimes; i++) {
        const res = await db.collection('custom_recipes')
          .skip(i * 100)
          .limit(100)
          .get()
        const customData = res.data.map(r => ({ ...r, source: 'custom' }))
        allRecipes = allRecipes.concat(customData)
      }
    } catch (e) {
      // custom_recipes 集合可能不存在，忽略
    }

    // 客户端筛选匹配
    let results = allRecipes.map(recipe => {
      let ingredientMatch = 0
      let cookwareMatch = false

      // 计算食材匹配度
      if (ingredients.length > 0) {
        let matchCount = 0
        let recipeIngredients = recipe.ingredients.map(i =>
          typeof i === 'object' ? i.name : i
        )
        ingredients.forEach(selected => {
          if (recipeIngredients.includes(selected)) {
            matchCount++
          }
        })
        ingredientMatch = matchCount / recipeIngredients.length
      }

      // 检查锅具匹配
      if (cookware.length > 0) {
        cookwareMatch = recipe.cookware.some(rc => cookware.includes(rc))
      }

      // 综合得分
      let score = 0
      if (ingredients.length > 0 && cookware.length > 0) {
        score = ingredientMatch * 0.7 + (cookwareMatch ? 0.3 : 0)
      } else if (ingredients.length > 0) {
        score = ingredientMatch
      } else if (cookware.length > 0) {
        score = cookwareMatch ? 1 : 0
      }

      return {
        ...recipe,
        matchRate: Math.round(score * 100)
      }
    })

    // 过滤并排序
    results = results.filter(r => r.matchRate > 0)
    results.sort((a, b) => b.matchRate - a.matchRate)

    // 分页
    const start = (page - 1) * pageSize
    const pagedResults = results.slice(start, start + pageSize)

    return {
      code: 200,
      data: {
        list: pagedResults,
        total: results.length,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}

/**
 * 获取菜谱详情
 */
async function getRecipeDetail(data) {
  const { id } = data

  try {
    const res = await db.collection('recipes').doc(id).get()
    return {
      code: 200,
      data: res.data
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}

/**
 * 获取自定义菜谱详情
 */
async function getCustomRecipeDetail(data) {
  const { id } = data

  try {
    const res = await db.collection('custom_recipes').doc(id).get()
    return {
      code: 200,
      data: { ...res.data, source: 'custom' }
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}

/**
 * 初始化菜谱数据到云数据库
 */
async function initData(data) {
  const { recipes } = data

  try {
    const tasks = recipes.map(recipe => {
      return db.collection('recipes').add({ data: recipe })
    })

    const results = await Promise.all(tasks)

    return {
      code: 200,
      msg: `成功导入 ${results.length} 道菜谱`,
      data: results
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
