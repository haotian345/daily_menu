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
    case 'dedup':
      return await dedupRecipes()
    default:
      return { code: 400, msg: '未知操作' }
  }
}

/**
 * 搜索菜谱 - 根据食材和锅具匹配（同时搜索预设菜谱和用户自定义菜谱）
 */
async function searchRecipes(data) {
  const { ingredients = [], cookware = [] } = data
  const hasIngredients = ingredients.length > 0
  const hasCookware = cookware.length > 0

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

    // 合并后按 _id 去重（防止 recipes 与 custom_recipes 出现重复条目）
    const seenIds = new Set()
    allRecipes = allRecipes.filter(r => {
      const key = r._id
      if (seenIds.has(key)) return false
      seenIds.add(key)
      return true
    })

    // 筛选 + 计算匹配率
    let results = allRecipes.map(recipe => {
      let ingredientMatchCount = 0
      let cookwareMatchCount = 0

      // 计算食材命中数量（用户选中的食材中有几个在菜谱里）
      if (hasIngredients) {
        const recipeIngredientNames = (recipe.ingredients || []).map(i =>
          typeof i === 'object' ? i.name : i
        )
        ingredients.forEach(selected => {
          if (recipeIngredientNames.includes(selected)) {
            ingredientMatchCount++
          }
        })
      }

      // 计算锅具命中数量（用户选中的锅具中有几个在菜谱里）
      if (hasCookware) {
        const recipeCookware = recipe.cookware || []
        cookware.forEach(cw => {
          if (recipeCookware.includes(cw)) {
            cookwareMatchCount++
          }
        })
      }

      // 筛选规则：
      // - 选了食材 → 菜谱中必须至少有1个选中的食材，否则排除
      // - 选了锅具 → 菜谱必须用到至少1个选中的锅具，否则排除
      // - 两者都选 → 必须同时满足
      if (hasIngredients && ingredientMatchCount === 0) return null
      if (hasCookware && cookwareMatchCount === 0) return null

      // 匹配率 = 命中的选中项数（食材命中数 + 锅具命中数）/ 用户选中的总项数
      const totalSelected = (hasIngredients ? ingredients.length : 0) + (hasCookware ? cookware.length : 0)
      const totalHit = ingredientMatchCount + cookwareMatchCount
      const matchRate = totalSelected > 0 ? Math.round((totalHit / totalSelected) * 100) : 0

      return { ...recipe, matchRate }
    })

    // 过滤不满足的，按匹配率降序
    results = results.filter(r => r !== null)
    results.sort((a, b) => b.matchRate - a.matchRate)

    return {
      code: 200,
      data: {
        list: results,   // 返回全量结果，不分页
        total: results.length
      }
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}

/**
 * 获取菜谱详情（通过数字 id 字段查找）
 */
async function getRecipeDetail(data) {
  const { id } = data
  const numId = parseInt(id)

  try {
    // 优先通过数字 id 字段查询
    if (!isNaN(numId)) {
      const res = await db.collection('recipes').where({ id: numId }).orderBy('_id', 'asc').limit(1).get()
      if (res.data && res.data.length > 0) {
        // 如有重复记录，取第一条（_id 最小的，即最早导入的）
        return {
          code: 200,
          data: res.data[0]
        }
      }
    }

    // 兜底：尝试作为 _id 查询
    try {
      const res = await db.collection('recipes').doc(String(id)).get()
      return {
        code: 200,
        data: res.data
      }
    } catch (e) {
      return { code: 404, msg: '菜谱不存在' }
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

/**
 * 去重：按数字 id 字段去重，保留 _id 最小的（最早导入的），删除多余重复记录
 */
async function dedupRecipes() {
  try {
    // 分批拉取全部记录
    const countRes = await db.collection('recipes').count()
    const total = countRes.total
    let allRecipes = []
    const batchTimes = Math.ceil(total / 100)
    for (let i = 0; i < batchTimes; i++) {
      const res = await db.collection('recipes').orderBy('_id', 'asc').skip(i * 100).limit(100).get()
      allRecipes = allRecipes.concat(res.data)
    }

    // 按数字 id 分组，每组只保留第一条（_id 最小 = 最早导入）
    const seenIds = new Map()
    const toDelete = []
    allRecipes.forEach(r => {
      const key = r.id != null ? r.id : r.name // 优先用数字id，没有则用name
      if (seenIds.has(key)) {
        toDelete.push(r._id)
      } else {
        seenIds.set(key, r._id)
      }
    })

    if (toDelete.length === 0) {
      return { code: 200, msg: '无重复记录', deleted: 0 }
    }

    // 逐条删除（云函数不支持批量delete）
    for (const docId of toDelete) {
      await db.collection('recipes').doc(docId).remove()
    }

    return { code: 200, msg: `已删除 ${toDelete.length} 条重复记录`, deleted: toDelete.length }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
