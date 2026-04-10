Page({
  data: {
    menuItems: [
      { icon: '🥬', name: '食材管理', desc: '管理自定义食材', url: '/pages/manage-ingredients/manage-ingredients' },
      { icon: '🍳', name: '锅具管理', desc: '管理自定义锅具', url: '/pages/manage-cookware/manage-cookware' },
      { icon: '📖', name: '我的菜谱', desc: '管理自定义菜谱', url: '/pages/my-recipes/my-recipes' }
    ]
  },

  navigateTo(e) {
    const url = e.currentTarget.dataset.url
    wx.navigateTo({ url })
  },

  goBack() {
    wx.navigateBack()
  }
})
