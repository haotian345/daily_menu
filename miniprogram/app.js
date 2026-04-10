App({
  onLaunch: function () {
    try {
      if (wx.cloud) {
        wx.cloud.init({
          traceUser: true
        })
      }
    } catch (e) {
      console.warn('云开发初始化失败，使用本地数据:', e)
    }
    this.globalData = {}
  },
  globalData: {
    selectedIngredients: [],
    selectedCookware: []
  }
})
