const recipesData = require('../../data/recipes.js')

Page({
  data: {
    recipe: null,
    loading: true,
    notFound: false
  },

  onLoad(options) {
    const id = parseInt(options.id)
    if (options.fromRandom === 'true') {
      this.loadFromGlobal(id)
    } else {
      this.loadRecipe(id)
    }
  },

  /** 加载菜谱详情 */
  loadRecipe(id) {
    wx.showLoading({ title: '加载中...' })

    // 先尝试从全局获取
    const globalRecipe = getApp().globalData.currentRecipe
    if (globalRecipe && globalRecipe.id === id) {
      wx.hideLoading()
      this.setData({
        recipe: globalRecipe,
        loading: false
      })
      wx.setNavigationBarTitle({ title: globalRecipe.name })
      return
    }

    // 尝试云数据库
    if (wx.cloud) {
      this.loadFromCloud(id)
    } else {
      this.loadFromLocal(id)
    }
  },

  /** 从全局数据加载 */
  loadFromGlobal(id) {
    const globalRecipe = getApp().globalData.currentRecipe
    if (globalRecipe && globalRecipe.id === id) {
      this.setData({
        recipe: globalRecipe,
        loading: false
      })
      wx.setNavigationBarTitle({ title: globalRecipe.name })
    } else {
      this.loadRecipe(id)
    }
  },

  /** 从云数据库加载 */
  loadFromCloud(id) {
    wx.cloud.callFunction({
      name: 'getRecipes',
      data: {
        action: 'getDetail',
        data: { id: String(id) }
      }
    }).then(res => {
      wx.hideLoading()
      if (res.result.code === 200) {
        this.setData({
          recipe: res.result.data,
          loading: false
        })
        wx.setNavigationBarTitle({ title: res.result.data.name })
      } else {
        this.loadFromLocal(id)
      }
    }).catch(() => {
      this.loadFromLocal(id)
    })
  },

  /** 从本地数据加载 */
  loadFromLocal(id) {
    wx.hideLoading()
    const recipe = recipesData.find(r => r.id === id)
    if (recipe) {
      this.setData({
        recipe,
        loading: false
      })
      wx.setNavigationBarTitle({ title: recipe.name })
    } else {
      this.setData({
        loading: false,
        notFound: true
      })
    }
  },

  /** 复制食材清单 */
  copyIngredients() {
    const { recipe } = this.data
    if (!recipe) return

    const list = recipe.ingredients.map(i => `${i.name} ${i.amount}`).join('\n')
    wx.setClipboardData({
      data: `【${recipe.name}】食材清单：\n${list}`,
      success: () => {
        wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
      }
    })
  },

  /** 分享菜谱 */
  onShareAppMessage() {
    const { recipe } = this.data
    return {
      title: `教你做${recipe.name} - 每日菜单`,
      path: `/pages/detail/detail?id=${recipe.id}`
    }
  },

  /** 收藏菜谱 */
  toggleFavorite() {
    wx.showToast({ title: '收藏功能开发中', icon: 'none' })
  },

  /** 打开视频链接 */
  openVideo() {
    const { recipe } = this.data
    if (!recipe || !recipe.videoUrl) {
      wx.showToast({ title: '暂无视频教程', icon: 'none' })
      return
    }
    // 复制链接让用户在浏览器中打开
    wx.setClipboardData({
      data: recipe.videoUrl,
      success: () => {
        wx.showToast({ title: '视频链接已复制', icon: 'success' })
      }
    })
  }
})
