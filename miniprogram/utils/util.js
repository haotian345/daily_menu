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
  let results = recipes.map(recipe => {
    let ingredientMatch = 0
    let cookwareMatch = false

    // 计算食材匹配度
    if (ingredients && ingredients.length > 0) {
      let matchCount = 0
      recipe.ingredients.forEach(ri => {
        if (ingredients.some(si => si === ri.name)) {
          matchCount++
        }
      })
      ingredientMatch = matchCount / recipe.ingredients.length
    }

    // 检查锅具匹配
    if (cookware && cookware.length > 0) {
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

  // 过滤掉完全不匹配的
  results = results.filter(r => r.matchRate > 0)
  // 按匹配度排序
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
