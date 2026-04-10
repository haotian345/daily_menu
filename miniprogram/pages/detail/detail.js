const recipesData = require('../../data/recipes.js')

Page({
  data: {
    recipe: null,
    loading: true,
    notFound: false,
    source: '',
    isCustom: false
  },

  onLoad(options) {
    const id = parseInt(options.id)
    this.setData({ source: options.source || '' })

    if (options.fromRandom === 'true') {
      this.loadFromGlobal(id)
    } else if (options.source === 'custom') {
      this.loadCustomRecipe(options.id)
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

  /** 加载自定义菜谱 */
  loadCustomRecipe(id) {
    wx.showLoading({ title: '加载中...' })
    if (wx.cloud) {
      wx.cloud.callFunction({
        name: 'getRecipes',
        data: {
          action: 'getCustomDetail',
          data: { id: id }
        }
      }).then(res => {
        wx.hideLoading()
        if (res.result.code === 200) {
          this.setData({
            recipe: res.result.data,
            loading: false,
            isCustom: true
          })
          wx.setNavigationBarTitle({ title: res.result.data.name })
        } else {
          this.setData({ loading: false, notFound: true })
        }
      }).catch(() => {
        wx.hideLoading()
        this.setData({ loading: false, notFound: true })
      })
    } else {
      wx.hideLoading()
      this.setData({ loading: false, notFound: true })
    }
  },

  /** 编辑菜谱 */
  editRecipe() {
    const { recipe } = this.data
    if (!recipe) return
    wx.navigateTo({
      url: `/pages/add-recipe/add-recipe?id=${recipe._id}`
    })
  },

  /** 删除菜谱 */
  deleteRecipe() {
    const { recipe } = this.data
    if (!recipe) return
    wx.showModal({
      title: '确认删除',
      content: `确定要删除菜谱"${recipe.name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('custom_recipes').doc(recipe._id).remove()
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => wx.navigateBack(), 1000)
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
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
