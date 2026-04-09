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
        const list = res.result.data.list
        this.setData({
          recipes: list,
          totalCount: res.result.data.total,
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
    const recipe = this.data.recipes.find(r => r.id === id)

    if (recipe) {
      // 将菜谱数据存到全局，方便详情页获取
      getApp().globalData.currentRecipe = recipe
    }

    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    })
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
