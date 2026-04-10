const recipesData = require('../../data/recipes.js')

Page({
  data: {
    recipe: null,
    loading: false,  // 默认不显示 loading，有缓存时直接渲染
    notFound: false,
    source: '',
    isCustom: false
  },

  onLoad(options) {
    const dbId = options.dbid ? decodeURIComponent(options.dbid) : ''
    const id = parseInt(options.id)
    const rawId = options.id
    this.setData({ source: options.source || '' })

    if (options.fromRandom === 'true') {
      this.loadFromGlobal(id, dbId)
    } else if (options.source === 'custom') {
      this.loadCustomRecipe(dbId || rawId)
    } else {
      this.loadRecipe(id, dbId)
    }
  },

  /** 加载菜谱详情 */
  loadRecipe(id, dbId) {
    // 第一步：同步检查 globalData 缓存，命中则直接渲染，完全不显示 loading
    const app = getApp()
    const globalRecipe = app.globalData.currentRecipe
    const globalDbId = app.globalData.currentRecipeDbId || ''
    const idMatch = globalRecipe && (
      (dbId && globalDbId === dbId) ||
      (!dbId && globalRecipe.id === id)
    )
    if (idMatch) {
      this.setData({ recipe: globalRecipe, loading: false })
      wx.setNavigationBarTitle({ title: globalRecipe.name })
      return
    }

    // 第二步：本地 JSON 数据同步查找
    const localRecipe = recipesData.find(r => r.id === id)
    if (localRecipe) {
      this.setData({ recipe: localRecipe, loading: false })
      wx.setNavigationBarTitle({ title: localRecipe.name })
      return
    }

    // 第三步：以上都没有才走网络请求，此时才显示 loading
    this.setData({ loading: true })
    if (dbId && wx.cloud) {
      this.loadFromCloudByDbId(dbId)
    } else if (wx.cloud) {
      this.loadFromCloud(id)
    } else {
      this.setData({ loading: false, notFound: true })
    }
  },

  /** 从全局数据加载（随机推荐场景） */
  loadFromGlobal(id, dbId) {
    const app = getApp()
    const globalRecipe = app.globalData.currentRecipe
    const globalDbId = app.globalData.currentRecipeDbId || ''
    const idMatch = globalRecipe && (
      (dbId && globalDbId === dbId) ||
      (!dbId && globalRecipe.id === id)
    )
    if (idMatch) {
      this.setData({
        recipe: globalRecipe,
        loading: false
      })
      wx.setNavigationBarTitle({ title: globalRecipe.name })
    } else {
      this.loadRecipe(id, dbId)
    }
  },

  /** 通过云数据库 _id 直接加载（最精确，避免重复记录） */
  loadFromCloudByDbId(dbId) {
    const db = wx.cloud.database()
    db.collection('recipes').doc(dbId).get().then(res => {
      this.setData({ recipe: res.data, loading: false })
      wx.setNavigationBarTitle({ title: res.data.name })
    }).catch(() => {
      // doc(dbId) 查不到时直接显示未找到，无法通过数字 id 回退
      this.setData({ loading: false, notFound: true })
    })
  },

  /** 从云数据库加载（通过数字 id 字段查询） */
  loadFromCloud(id) {
    wx.cloud.callFunction({
      name: 'getRecipes',
      data: { action: 'getDetail', data: { id: id } }
    }).then(res => {
      if (res.result.code === 200) {
        this.setData({ recipe: res.result.data, loading: false })
        wx.setNavigationBarTitle({ title: res.result.data.name })
      } else {
        this.setData({ loading: false, notFound: true })
      }
    }).catch(() => {
      this.setData({ loading: false, notFound: true })
    })
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
    // 先查 globalData 缓存（自定义菜谱也可能已缓存）
    const app = getApp()
    const globalRecipe = app.globalData.currentRecipe
    const globalDbId = app.globalData.currentRecipeDbId || ''
    if (globalRecipe && (globalDbId === id || String(globalRecipe._id) === String(id))) {
      this.setData({ recipe: globalRecipe, loading: false, isCustom: true })
      wx.setNavigationBarTitle({ title: globalRecipe.name })
      return
    }

    this.setData({ loading: true })
    if (wx.cloud) {
      wx.cloud.callFunction({
        name: 'getRecipes',
        data: { action: 'getCustomDetail', data: { id: id } }
      }).then(res => {
        if (res.result.code === 200) {
          this.setData({ recipe: res.result.data, loading: false, isCustom: true })
          wx.setNavigationBarTitle({ title: res.result.data.name })
        } else {
          this.setData({ loading: false, notFound: true })
        }
      }).catch(() => {
        this.setData({ loading: false, notFound: true })
      })
    } else {
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
