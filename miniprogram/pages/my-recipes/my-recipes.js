const { getAllCollection } = require('../../utils/util.js')

Page({
  data: {
    recipes: [],
    loading: true
  },

  onShow() {
    this.loadRecipes()
  },

  /** 从云数据库加载自定义菜谱 */
  loadRecipes() {
    this.setData({ loading: true })
    try {
      const db = wx.cloud.database()
      getAllCollection(db.collection('custom_recipes'), { orderBy: 'createdAt' }).then(data => {
        const recipes = data.map(r => {
          r.ingredientNames = (r.ingredients || []).map(i => i.name).join('、')
          return r
        })
        this.setData({
          recipes: recipes,
          loading: false
        })
      }).catch(() => {
        this.setData({ loading: false })
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  /** 查看菜谱详情 */
  viewRecipe(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&source=custom`
    })
  },

  /** 编辑菜谱 */
  editRecipe(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/add-recipe/add-recipe?id=${id}`
    })
  },

  /** 删除菜谱 */
  deleteRecipe(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '确认删除',
      content: `确定要删除菜谱"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('custom_recipes').doc(id).remove()
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadRecipes()
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  /** 添加新菜谱 */
  addRecipe() {
    wx.navigateTo({ url: '/pages/add-recipe/add-recipe' })
  }
})
