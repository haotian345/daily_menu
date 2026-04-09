const app = getApp()
const recipesData = require('../../data/recipes.js')

Page({
  data: {
    // 食材分类
    ingredientCategories: [
      {
        name: '肉类',
        icon: '🥩',
        items: ['猪肉', '牛肉', '鸡肉', '五花肉', '排骨', '鸡腿', '鸡翅', '里脊肉', '羊肉', '鸭肉']
      },
      {
        name: '海鲜',
        icon: '🐟',
        items: ['虾', '鱼', '蛤蜊', '鱿鱼', '带鱼', '鲈鱼', '三文鱼', '扇贝']
      },
      {
        name: '蔬菜',
        icon: '🥬',
        items: ['番茄', '土豆', '白菜', '青椒', '茄子', '黄瓜', '胡萝卜', '洋葱', '西兰花', '豆角', '芹菜', '莲藕', '冬瓜', '菠菜', '生菜', '南瓜']
      },
      {
        name: '蛋奶豆',
        icon: '🥚',
        items: ['鸡蛋', '豆腐', '豆腐干', '腐竹', '粉丝', '木耳', '牛奶', '芝士']
      },
      {
        name: '主食',
        icon: '🍚',
        items: ['大米', '面条', '面粉', '馒头', '饺子皮', '馄饨皮']
      },
      {
        name: '调味品',
        icon: '🧂',
        items: ['葱', '姜', '蒜', '辣椒', '花椒', '八角', '桂皮', '香菜']
      }
    ],
    activeCategory: 0,
    selectedIngredients: [],
    // 锅具列表
    cookwareList: [
      { name: '炒锅', icon: '🍳' },
      { name: '平底锅', icon: '🥘' },
      { name: '蒸锅', icon: '♨️' },
      { name: '煮锅', icon: '🍲' },
      { name: '砂锅', icon: '🫕' },
      { name: '电饭煲', icon: '🍚' },
      { name: '烤箱', icon: '🔥' },
      { name: '空气炸锅', icon: '💨' },
      { name: '高压锅', icon: ' pressured' },
      { name: '电饼铛', icon: '🫓' }
    ],
    selectedCookware: [],
    // 状态
    hasSelection: false
  },

  onLoad() {
    // 如果app中有缓存的选择，恢复
    if (app.globalData.selectedIngredients.length || app.globalData.selectedCookware.length) {
      this.setData({
        selectedIngredients: app.globalData.selectedIngredients,
        selectedCookware: app.globalData.selectedCookware,
        hasSelection: true
      })
    }
  },

  /** 切换食材分类 */
  switchCategory(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ activeCategory: index })
  },

  /** 选择/取消选择食材 */
  toggleIngredient(e) {
    const name = e.currentTarget.dataset.name
    let { selectedIngredients } = this.data
    const index = selectedIngredients.indexOf(name)

    if (index > -1) {
      selectedIngredients.splice(index, 1)
    } else {
      if (selectedIngredients.length >= 8) {
        wx.showToast({ title: '最多选择8种食材', icon: 'none' })
        return
      }
      selectedIngredients.push(name)
    }

    this.setData({
      selectedIngredients,
      hasSelection: selectedIngredients.length > 0 || this.data.selectedCookware.length > 0
    })
  },

  /** 选择/取消选择锅具 */
  toggleCookware(e) {
    const name = e.currentTarget.dataset.name
    let { selectedCookware } = this.data
    const index = selectedCookware.indexOf(name)

    if (index > -1) {
      selectedCookware.splice(index, 1)
    } else {
      if (selectedCookware.length >= 3) {
        wx.showToast({ title: '最多选择3种锅具', icon: 'none' })
        return
      }
      selectedCookware.push(name)
    }

    this.setData({
      selectedCookware,
      hasSelection: this.data.selectedIngredients.length > 0 || selectedCookware.length > 0
    })
  },

  /** 清空所有选择 */
  clearAll() {
    this.setData({
      selectedIngredients: [],
      selectedCookware: [],
      hasSelection: false
    })
    app.globalData.selectedIngredients = []
    app.globalData.selectedCookware = []
  },

  /** 移除单个已选食材 */
  removeIngredient(e) {
    const name = e.currentTarget.dataset.name
    let { selectedIngredients } = this.data
    const index = selectedIngredients.indexOf(name)
    if (index > -1) {
      selectedIngredients.splice(index, 1)
    }
    this.setData({
      selectedIngredients,
      hasSelection: selectedIngredients.length > 0 || this.data.selectedCookware.length > 0
    })
  },

  /** 移除单个已选锅具 */
  removeCookware(e) {
    const name = e.currentTarget.dataset.name
    let { selectedCookware } = this.data
    const index = selectedCookware.indexOf(name)
    if (index > -1) {
      selectedCookware.splice(index, 1)
    }
    this.setData({
      selectedCookware,
      hasSelection: this.data.selectedIngredients.length > 0 || selectedCookware.length > 0
    })
  },

  /** 搜索菜谱 */
  searchRecipes() {
    const { selectedIngredients, selectedCookware } = this.data

    if (!selectedIngredients.length && !selectedCookware.length) {
      wx.showToast({ title: '请至少选择一种食材或锅具', icon: 'none' })
      return
    }

    // 保存选择到全局
    app.globalData.selectedIngredients = selectedIngredients
    app.globalData.selectedCookware = selectedCookware

    // 跳转到结果页
    wx.navigateTo({
      url: `/pages/result/result?ingredients=${encodeURIComponent(JSON.stringify(selectedIngredients))}&cookware=${encodeURIComponent(JSON.stringify(selectedCookware))}`
    })
  },

  /** 随机推荐 */
  randomRecommend() {
    const recipes = recipesData
    const randomIndex = Math.floor(Math.random() * recipes.length)
    const recipe = recipes[randomIndex]

    wx.navigateTo({
      url: `/pages/detail/detail?id=${recipe.id}&fromRandom=true`
    })
  }
})
