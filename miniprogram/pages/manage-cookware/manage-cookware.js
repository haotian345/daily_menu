const { getAllCollection } = require('../../utils/util.js')

Page({
  data: {
    cookwareList: [],
    showAdd: false,
    editMode: false,
    editId: '',
    form: {
      name: '',
      icon: '🍳'
    },
    loading: true,
    iconOptions: ['🍳', '🥘', '♨️', '🍲', '🫕', '🍚', '🔥', '💨', '🫙', '🫓', '🔪', '🥄', '🍽', '🧑‍🍳'],
    selectedIcon: '🍳'
  },

  onShow() {
    this.loadCookware()
  },

  /** 从云数据库加载自定义锅具 */
  loadCookware() {
    try {
      const db = wx.cloud.database()
      getAllCollection(db.collection('custom_cookware'), { orderBy: 'createdAt' }).then(data => {
        this.setData({
          cookwareList: data,
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
      form: { name: '', icon: '🍳' },
      selectedIcon: '🍳'
    })
  },

  /** 显示编辑弹窗 */
  showEditDialog(e) {
    const item = e.currentTarget.dataset.item
    this.setData({
      showAdd: true,
      editMode: true,
      editId: item._id,
      form: { name: item.name, icon: item.icon || '🍳' },
      selectedIcon: item.icon || '🍳'
    })
  },

  /** 隐藏弹窗 */
  hideAddDialog() {
    this.setData({ showAdd: false })
  },

  /** 输入锅具名称 */
  onNameInput(e) {
    this.setData({ 'form.name': e.detail.value })
  },

  /** 选择图标 */
  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon
    this.setData({ 'form.icon': icon, selectedIcon: icon })
  },

  /** 保存锅具 */
  async saveCookware() {
    const { form, editMode, editId } = this.data
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入锅具名称', icon: 'none' })
      return
    }

    wx.showLoading({ title: '保存中...' })
    try {
      const db = wx.cloud.database()
      if (editMode && editId) {
        await db.collection('custom_cookware').doc(editId).update({
          data: {
            name: form.name.trim(),
            icon: form.icon
          }
        })
      } else {
        await db.collection('custom_cookware').add({
          data: {
            name: form.name.trim(),
            icon: form.icon,
            createdAt: db.serverDate()
          }
        })
      }
      wx.hideLoading()
      wx.showToast({ title: editMode ? '已更新' : '已添加', icon: 'success' })
      this.setData({ showAdd: false })
      this.loadCookware()
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  /** 删除锅具 */
  deleteCookware(e) {
    const id = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name
    wx.showModal({
      title: '确认删除',
      content: `确定要删除锅具"${name}"吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const db = wx.cloud.database()
            await db.collection('custom_cookware').doc(id).remove()
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadCookware()
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
