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

// 被视为「家庭常备调料」的用量关键词，不计入「缺少」
const PANTRY_AMOUNTS = ['适量', '少许', '少量', '适当']

/**
 * 判断某食材是否为常备调料（用量含「适量/少许」等）
 */
function isPantry(ingredient) {
  const amount = typeof ingredient === 'object' ? (ingredient.amount || '') : ''
  return PANTRY_AMOUNTS.some(kw => amount.includes(kw))
}

/**
 * 根据选择的食材和锅具筛选菜谱
 *
 * 匹配策略：
 *  1. 将菜谱食材拆分为「主料」（有明确用量）和「常备调料」（适量/少许）
 *  2. missingCount = 主料中用户没有的数量（越少越好）
 *  3. utilization  = 用户选中的食材被菜谱用上的数量（越多越好）
 *  4. matchRate    = 用户拥有的主料 / 菜谱主料总数 × 100（展示用）
 *  5. 排序：missingCount 升序 → utilization 降序 → matchRate 降序
 *
 * @param {Array} recipes - 所有菜谱
 * @param {Array} ingredients - 选择的食材（字符串数组）
 * @param {Array} cookware - 选择的锅具（字符串数组）
 * @returns {Array} 匹配的菜谱，按策略排序
 */
function filterRecipes(recipes, ingredients, cookware) {
  const hasIngredients = ingredients && ingredients.length > 0
  const hasCookware = cookware && cookware.length > 0

  // 无任何筛选条件时，返回全部菜谱
  if (!hasIngredients && !hasCookware) {
    return recipes.map(r => ({ ...r, matchRate: 100, missingCount: 0 }))
  }

  let results = recipes.map(recipe => {
    const allIngredients = recipe.ingredients || []

    // 拆分主料 vs 常备调料
    const mainNames   = allIngredients.filter(i => !isPantry(i)).map(i => typeof i === 'object' ? i.name : i)
    const pantryNames = allIngredients.filter(i =>  isPantry(i)).map(i => typeof i === 'object' ? i.name : i)
    const allNames    = [...mainNames, ...pantryNames]

    // 锅具命中数
    let cookwareMatchCount = 0
    if (hasCookware) {
      const recipeCookware = recipe.cookware || []
      cookware.forEach(cw => { if (recipeCookware.includes(cw)) cookwareMatchCount++ })
    }

    if (hasCookware && cookwareMatchCount === 0) return null

    if (hasIngredients) {
      // utilization：用户选的食材有几个在菜谱中出现（主料+调料都算）
      const utilization = ingredients.filter(si => allNames.includes(si)).length

      // 至少命中一个食材才保留
      if (utilization === 0) return null

      // missingCount：菜谱主料中用户没有的数量（常备调料默认有，不计）
      const missingCount = mainNames.filter(name => !ingredients.includes(name)).length

      // matchRate：用户拥有的主料占比（0-100，用于展示）
      const matchRate = mainNames.length > 0
        ? Math.round(((mainNames.length - missingCount) / mainNames.length) * 100)
        : 100

      return { ...recipe, matchRate, missingCount, utilization }
    }

    // 只选了锅具没选食材：直接通过，不计食材分
    return { ...recipe, matchRate: 100, missingCount: 0, utilization: 0 }
  })

  results = results.filter(r => r !== null)

  // 排序：缺少主料越少越前；缺少数相同时，用上你食材越多越前；再按 matchRate
  results.sort((a, b) => {
    if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount
    if (b.utilization !== a.utilization)   return b.utilization - a.utilization
    return b.matchRate - a.matchRate
  })

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
