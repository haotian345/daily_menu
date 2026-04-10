const { getAllCollection } = require('../../utils/util.js')

Page({
  data: {
    categories: ['肉类', '海鲜', '蔬菜', '蛋奶豆', '主食', '调味品'],
    ingredients: [],
    showAdd: false,
    editMode: false,
    editId: '',
    form: {
      name: '',
      category: '蔬菜',
      icon: '🍽'
    },
    loading: true
  },

  onShow() {
    this.loadIngredients()
  },

  /** 从云数据库加载自定义食材 */
  loadIngredients() {
    try {
      const db = wx.cloud.database()
      getAllCollection(db.collection('custom_ingredients'), { orderBy: 'createdAt' }).then(data => {
        this.setData({
          ingredients: data,
          loading: false
        })
      }).catch(() => {
        this.setData({ loading: false })
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  /** 显示添加弹窗 */
  showAddDialog() {
    this.setData({
      showAdd: true,
      editMode: false,
      editId: '',
      form: { name: '', category: '蔬菜', icon: '🍽' }
    })
  },

  /** 显示编辑弹窗 */
  showEditDialog(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showAdd: true,
      editMode: true,
      editId: item._id,
      form: {
        name: item.name,
        category: item.category,
        icon: item.icon || '🍽'
      }
    })
  },

  /** 隐藏弹窗 */
  hideAddDialog() {
    this.setData({ showAdd: false })
  },

  /** 输入食材名称 */
  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  /** 选择分类 */
  onCategoryChange(e) {
    const index = e.detail.value
    this.setData({ 'form.category': this.data.categories[index] })
  },

  /** 保存食材 */
  async saveIngredient() {
    const { form, editMode, editId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入食材名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      const db = wx.cloud.database()
      if (editMode && editId) {
        await db.collection('custom_ingredients').doc(editId).update({
          data: {
            name: form.name.trim(),
            category: form.category,
            icon: form.icon
          }
        })
      } else {
        await db.collection('custom_ingredients').add({
          data: {
            name: form.name.trim(),
            category: form.category,
            icon: form.icon,
            createdAt: db.serverDate()
          }
        })
      }
      wx.hideLoading()
      wx.showToast({ title: editMode ? '已更新' : '已添加', icon: 'success' })
      this.setData({ showAdd: false })
      this.loadIngredients()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  /** 删除食材 */
  deleteIngredient(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '确认删除',
      content: `确定要删除食材"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('custom_ingredients').doc(id).remove()
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadIngredients()
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
