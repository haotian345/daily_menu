const app = getApp()
const { COOKWARE_LIST } = require('../../data/constants.js')
const { getAllCollection } = require('../../utils/util.js')

Page({
  data: {
    // 表单数据
    form: {
      name: '',
      category: '家常菜',
      difficulty: '简单',
      cookTime: '30分钟',
      servings: '2人份',
      description: '',
      tips: ''
    },
    // 选项数据
    categories: ['家常菜', '川菜', '粤菜', '湘菜', '东北菜', '汤品', '甜品小吃', '西餐', '其他'],
    difficulties: ['简单', '中等', '困难'],
    cookTimes: ['15分钟', '20分钟', '30分钟', '45分钟', '60分钟', '90分钟', '120分钟'],
    servingsOptions: ['1人份', '2人份', '3人份', '4人份', '5人份以上'],

    // 食材列表
    ingredients: [{ name: '', amount: '' }],
    // 步骤列表
    steps: [{ description: '' }],
    // 锅具选择
    allCookware: [],
    selectedCookware: [],

    // 编辑模式
    editMode: false,
    editId: '',
    submitting: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ editMode: true, editId: options.id })
      this.loadRecipe(options.id)
    }
    this.loadCookwareList()
  },

  /** 加载锅具列表（预设+自定义） */
  loadCookwareList() {
    const presetCookware = COOKWARE_LIST.slice()

    try {
      const db = wx.cloud.database()
      getAllCollection(db.collection('custom_cookware')).then(data => {
        const custom = data.map(c => ({ name: c.name, icon: c.icon || '🍳' }))
        this.setData({ allCookware: presetCookware.concat(custom) })
      }).catch(() => {
        this.setData({ allCookware: presetCookware })
      })
    } catch (e) {
      this.setData({ allCookware: presetCookware })
    }
  },

  /** 加载菜谱用于编辑 */
  loadRecipe(id) {
    wx.showLoading({ title: '加载中...' })
    try {
      const db = wx.cloud.database()
      db.collection('custom_recipes').doc(id).get().then(res => {
        wx.hideLoading()
        const r = res.data
        this.setData({
          form: {
            name: r.name,
            category: r.category,
            difficulty: r.difficulty,
            cookTime: r.cookTime,
            servings: r.servings,
            description: r.description || '',
            tips: r.tips || ''
          },
          ingredients: r.ingredients && r.ingredients.length ? r.ingredients : [{ name: '', amount: '' }],
          steps: r.steps && r.steps.length ? r.steps : [{ description: '' }],
          selectedCookware: r.cookware || []
        })
      }).catch(() => {
        wx.hideLoading()
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
    } catch (e) {
      wx.hideLoading()
    }
  },

  // ===== 表单输入方法 =====
  onNameInput(e) { this.setData({ 'form.name': e.detail.value }) },
  onDescInput(e) { this.setData({ 'form.description': e.detail.value }) },
  onTipsInput(e) { this.setData({ 'form.tips': e.detail.value }) },

  onCategoryChange(e) {
    this.setData({ 'form.category': this.data.categories[e.detail.value] })
  },
  onDifficultyChange(e) {
    this.setData({ 'form.difficulty': this.data.difficulties[e.detail.value] })
  },
  onCookTimeChange(e) {
    this.setData({ 'form.cookTime': this.data.cookTimes[e.detail.value] })
  },
  onServingsChange(e) {
    this.setData({ 'form.servings': this.data.servingsOptions[e.detail.value] })
  },

  // ===== 食材操作 =====
  onIngNameInput(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ [`ingredients[${idx}].name`]: e.detail.value })
  },
  onIngAmountInput(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ [`ingredients[${idx}].amount`]: e.detail.value })
  },
  addIngredient() {
    this.setData({ ingredients: this.data.ingredients.concat([{ name: '', amount: '' }]) })
  },
  removeIngredient(e) {
    const idx = e.currentTarget.dataset.index
    if (this.data.ingredients.length <= 1) {
      wx.showToast({ title: '至少保留一项', icon: 'none' })
      return
    }
    const list = this.data.ingredients.slice()
    list.splice(idx, 1)
    this.setData({ ingredients: list })
  },

  // ===== 步骤操作 =====
  onStepInput(e) {
    const idx = e.currentTarget.dataset.index
    this.setData({ [`steps[${idx}].description`]: e.detail.value })
  },
  addStep() {
    this.setData({ steps: this.data.steps.concat([{ description: '' }]) })
  },
  removeStep(e) {
    const idx = e.currentTarget.dataset.index
    if (this.data.steps.length <= 1) {
      wx.showToast({ title: '至少保留一步', icon: 'none' })
      return
    }
    const list = this.data.steps.slice()
    list.splice(idx, 1)
    this.setData({ steps: list })
  },

  // ===== 锅具选择 =====
  toggleCookware(e) {
    const name = e.currentTarget.dataset.name
    let { selectedCookware } = this.data
    const idx = selectedCookware.indexOf(name)
    if (idx > -1) {
      selectedCookware.splice(idx, 1)
    } else {
      selectedCookware.push(name)
    }
    this.setData({ selectedCookware })
  },

  // ===== 提交 =====
  async submitRecipe() {
    const { form, ingredients, steps, selectedCookware, editMode, editId } = this.data

    // 验证
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入菜谱名称', icon: 'none' })
      return
    }

    const validIngredients = ingredients.filter(i => i.name.trim())
    if (validIngredients.length === 0) {
      wx.showToast({ title: '请至少添加一种食材', icon: 'none' })
      return
    }

    const validSteps = steps.filter(s => s.description.trim())
    if (validSteps.length === 0) {
      wx.showToast({ title: '请至少添加一个步骤', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中...' })

    try {
      const db = wx.cloud.database()
      const recipeData = {
        name: form.name.trim(),
        category: form.category,
        difficulty: form.difficulty,
        cookTime: form.cookTime,
        servings: form.servings,
        description: form.description.trim(),
        cookware: selectedCookware,
        ingredients: validIngredients,
        steps: validSteps,
        tips: form.tips.trim()
      }

      if (editMode && editId) {
        recipeData.updatedAt = db.serverDate()
        await db.collection('custom_recipes').doc(editId).update({ data: recipeData })
      } else {
        recipeData.createdAt = db.serverDate()
        recipeData.updatedAt = db.serverDate()
        await db.collection('custom_recipes').add({ data: recipeData })
      }

      wx.hideLoading()
      wx.showToast({ title: editMode ? '已更新' : '添加成功', icon: 'success' })

      setTimeout(() => {
        wx.navigateBack()
      }, 1000)
    } catch (err) {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  }
})
