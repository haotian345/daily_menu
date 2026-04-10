const { filterRecipes } = require('../../utils/util.js')
const recipesData = require('../../data/recipes.js')

Page({
  data: {
    recipes: [],
    loading: true,
    empty: false,
    ingredients: [],
    cookware: [],
    totalCount: 0
  },

  onLoad(options) {
    try {
      const ingredients = JSON.parse(decodeURIComponent(options.ingredients || '[]'))
      const cookware = JSON.parse(decodeURIComponent(options.cookware || '[]'))

      this.setData({ ingredients, cookware })
      this.loadRecipes(ingredients, cookware)
    } catch (e) {
      console.error('参数解析失败', e)
      this.setData({ loading: false, empty: true })
    }
  },

  /** 加载菜谱数据 */
  loadRecipes(ingredients, cookware) {
    wx.showLoading({ title: '搜索中...' })

    // 尝试使用云数据库
    if (wx.cloud) {
      this.loadFromCloud(ingredients, cookware)
    } else {
      // 降级使用本地数据
      this.loadFromLocal(ingredients, cookware)
    }
  },

  /** 从云数据库加载 */
  loadFromCloud(ingredients, cookware) {
    wx.cloud.callFunction({
      name: 'getRecipes',
      data: {
        action: 'search',
        data: { ingredients, cookware }
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.code === 200) {
        // 云函数合并了 recipes + custom_recipes，按业务 id（而非 _id）去重
        // 同一道菜在数据库可能有多条重复记录（_id 不同但 id 相同），需用 id 去重
        const rawList = res.result.data.list
        const seen = new Set()
        const deduped = rawList.filter(r => {
          const key = r.id != null ? String(r.id) : r._id  // 优先用业务 id
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        // 客户端再次过滤：防止云函数版本与客户端逻辑不一致时漏过不符合条件的结果
        const list = filterRecipes(deduped, ingredients, cookware)
        this.setData({
          recipes: list,
          totalCount: list.length,
          loading: false,
          empty: list.length === 0
        })
      } else {
        this.loadFromLocal(ingredients, cookware)
      }
    }).catch(err => {
      console.error('云函数调用失败，使用本地数据', err)
      this.loadFromLocal(ingredients, cookware)
    })
  },

  /** 从本地数据加载 */
  loadFromLocal(ingredients, cookware) {
    wx.hideLoading()
    const results = filterRecipes(recipesData, ingredients, cookware)
    this.setData({
      recipes: results,
      totalCount: results.length,
      loading: false,
      empty: results.length === 0
    })
  },

  /** 跳转到菜谱详情 */
  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    const dbId = e.currentTarget.dataset.dbid || ''
    const source = e.currentTarget.dataset.source || ''
    // 优先通过 _id（云数据库真实主键）匹配，找不到再比较 id
    const recipe = this.data.recipes.find(r => r._id === dbId) ||
                   this.data.recipes.find(r => r.id === id)

    if (recipe) {
      // 将完整菜谱数据存到全局，详情页直接使用，避免 id 不匹配问题
      getApp().globalData.currentRecipe = recipe
      getApp().globalData.currentRecipeDbId = recipe._id || ''
    }

    // 优先用 _id 传递（云数据库记录的唯一主键），避免重复记录时取错
    const idParam = dbId ? `dbid=${encodeURIComponent(dbId)}` : `id=${id}`
    const url = source === 'custom'
      ? `/pages/detail/detail?${idParam}&source=custom`
      : `/pages/detail/detail?${idParam}`

    wx.navigateTo({ url })
  },

  /** 返回重新选择 */
  goBack() {
    wx.navigateBack()
  },

  /** 查看全部菜谱 */
  viewAll() {
    wx.showLoading({ title: '加载中...' })
    const results = filterRecipes(recipesData, [], [])
    this.setData({
      recipes: results,
      totalCount: results.length,
      loading: false,
      empty: results.length === 0
    })
    wx.hideLoading()
  }
})
