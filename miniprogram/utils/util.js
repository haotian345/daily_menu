/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

/**
 * 计算食材匹配度
 * @param {Array} selected - 用户选择的食材
 * @param {Array} required - 菜谱所需食材
 * @returns {number} 匹配度百分比 0-100
 */
function calcMatchRate(selected, required) {
  if (!selected || !selected.length) return 0
  if (!required || !required.length) return 0

  let matchCount = 0
  required.forEach(item => {
    if (selected.some(s => s.name === item.name)) {
      matchCount++
    }
  })
  return Math.round((matchCount / required.length) * 100)
}

/**
 * 根据选择的食材和锅具筛选菜谱
 * @param {Array} recipes - 所有菜谱
 * @param {Array} ingredients - 选择的食材
 * @param {Array} cookware - 选择的锅具
 * @returns {Array} 匹配的菜谱，按匹配度排序
 */
function filterRecipes(recipes, ingredients, cookware) {
  const hasIngredients = ingredients && ingredients.length > 0
  const hasCookware = cookware && cookware.length > 0

  // 无任何筛选条件时，返回全部菜谱（匹配率统一显示为 100）
  if (!hasIngredients && !hasCookware) {
    return recipes.map(r => ({ ...r, matchRate: 100 }))
  }

  let results = recipes.map(recipe => {
    let ingredientMatchCount = 0
    let cookwareMatchCount = 0

    // 计算食材命中数量（用户选的食材中有几个在菜谱里出现）
    if (hasIngredients) {
      const recipeIngredientNames = (recipe.ingredients || []).map(ri =>
        typeof ri === 'object' ? ri.name : ri
      )
      ingredients.forEach(si => {
        if (recipeIngredientNames.includes(si)) {
          ingredientMatchCount++
        }
      })
    }

    // 计算锅具命中数量（用户选的锅具中有几个在菜谱里出现）
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
    if (hasIngredients && ingredientMatchCount === 0) {
      return null
    }
    if (hasCookware && cookwareMatchCount === 0) {
      return null
    }

    // 匹配率 = 命中的选中项数（食材命中数 + 锅具命中数）/ 用户选中的总项数
    const totalSelected = (hasIngredients ? ingredients.length : 0) + (hasCookware ? cookware.length : 0)
    const totalHit = ingredientMatchCount + cookwareMatchCount
    const matchRate = totalSelected > 0 ? Math.round((totalHit / totalSelected) * 100) : 0

    return { ...recipe, matchRate }
  })

  // 过滤掉不满足条件的（null）
  results = results.filter(r => r !== null)
  // 按匹配率降序排序
  results.sort((a, b) => b.matchRate - a.matchRate)

  return results
}

/**
 * 分页获取云数据库集合的全部数据
 * @param {Object} collection - db.collection('xxx') 实例
 * @param {Object} [options] - 可选参数，如 orderBy 等
 * @returns {Promise<Array>} 全部数据
 */
async function getAllCollection(collection, options) {
  const countRes = await collection.count()
  const total = countRes.total
  if (total === 0) return []

  let allData = []
  const batchTimes = Math.ceil(total / 100)
  for (let i = 0; i < batchTimes; i++) {
    let q = collection
    if (options && options.orderBy) {
      q = collection.orderBy(options.orderBy, 'desc')
    }
    const res = await q.skip(i * 100).limit(100).get()
    allData = allData.concat(res.data)
  }
  return allData
}

module.exports = {
  formatTime,
  calcMatchRate,
  filterRecipes,
  getAllCollection
}
