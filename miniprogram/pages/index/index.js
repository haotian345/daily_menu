const app = getApp()
const recipesData = require('../../data/recipes.js')
const { COOKWARE_LIST } = require('../../data/constants.js')
const { getAllCollection } = require('../../utils/util.js')

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
    cookwareList: COOKWARE_LIST.slice(),
    selectedCookware: [],
    // 状态
    hasSelection: false,
    // 快速添加弹窗
    showAddIngredient: false,
    quickIngredientName: '',
    quickIngredientCategory: '蔬菜',
    quickCategoryIndex: 2,
    showAddCookware: false,
    quickCookwareName: ''
  },

  onLoad() {
    // 如果app中有缓存的选择，恢复
    var gd = app.globalData || {}
    if ((gd.selectedIngredients && gd.selectedIngredients.length) || (gd.selectedCookware && gd.selectedCookware.length)) {
      this.setData({
        selectedIngredients: gd.selectedIngredients || [],
        selectedCookware: gd.selectedCookware || [],
        hasSelection: true
      })
    }
    // 自动导入菜谱到云数据库（每次冷启动只运行一次，防止重复写库）
    this.initCloudData()
    // 加载用户自定义食材和锅具
    this.loadCustomData()
  },

  /** 自动导入菜谱数据到云数据库 */
  initCloudData() {
    // 用 app 全局标志，保证整个 App 生命周期只运行一次
    if (app.globalData._cloudDataInited) return
    app.globalData._cloudDataInited = true

    try {
      const db = wx.cloud.database()
      db.collection('recipes').count().then(res => {
        const totalCount = recipesData.length
        if (res.total === 0) {
          // 全新导入
          console.log('开始导入菜谱数据...')
          const batchSize = 20
          let chain = Promise.resolve()
          for (let i = 0; i < totalCount; i += batchSize) {
            const batch = recipesData.slice(i, i + batchSize)
            chain = chain.then(() => Promise.all(batch.map(r => db.collection('recipes').add({ data: r }))))
          }
          chain.then(() => {
            console.log('菜谱数据导入完成，共' + totalCount + '道')
          }).catch(err => {
            console.warn('菜谱导入失败:', err.message || err)
          })
          return
        }

        // 已有数据：先去重（云函数端执行，只做一次），再补全缺失
        const dedupDone = wx.getStorageSync('_dedupDone')
        const dedupPromise = dedupDone
          ? Promise.resolve()
          : wx.cloud.callFunction({ name: 'getRecipes', data: { action: 'dedup' } })
              .then(r => {
                const result = r.result || {}
                console.log('去重完成:', result.msg || result)
                wx.setStorageSync('_dedupDone', '1')
              })
              .catch(err => console.warn('去重失败:', err.message || err))

        dedupPromise.then(() => {
          // 拉取去重后的全量数据，补全本地有但云上缺的菜谱
          const batchTimes = Math.ceil(res.total / 100)
          let allExisting = []
          let p = Promise.resolve()
          for (let i = 0; i < batchTimes; i++) {
            p = p.then(() => db.collection('recipes').skip(i * 100).limit(100).get()).then(r => {
              allExisting = allExisting.concat(r.data)
            })
          }
          return p.then(() => {
            // 修复旧格式 steps（字符串 → 对象）
            const needFix = allExisting.filter(r => r.steps && r.steps.length > 0 && typeof r.steps[0] === 'string')
            if (needFix.length > 0) {
              console.log('修复 ' + needFix.length + ' 道菜谱的 steps 格式')
              const fixTasks = needFix.map(r => db.collection('recipes').doc(r._id).update({
                data: { steps: r.steps.map(s => ({ description: s, image: '' })) }
              }))
              return Promise.all(fixTasks).then(() => allExisting)
            }
            return allExisting
          }).then(existing => {
            // 补全缺失菜谱（按 id 和 name 双重去重，避免重复导入）
            const existingIds = new Set(existing.map(r => r.id).filter(id => id != null))
            const existingNames = new Set(existing.map(r => r.name).filter(n => n))
            const toImport = recipesData.filter(r => !existingIds.has(r.id) && !existingNames.has(r.name))
            if (toImport.length === 0) {
              console.log('菜谱数据已是最新')
              return
            }
            console.log('补全 ' + toImport.length + ' 道缺失菜谱')
            const batchSize = 20
            let chain = Promise.resolve()
            for (let i = 0; i < toImport.length; i += batchSize) {
              const batch = toImport.slice(i, i + batchSize)
              chain = chain.then(() => Promise.all(batch.map(r => db.collection('recipes').add({ data: r }))))
            }
            return chain
          })
        }).then(() => {
          console.log('菜谱数据同步完成')
        }).catch(err => {
          console.warn('菜谱同步失败:', err.message || err)
        })
      }).catch(err => {
        console.warn('云数据库未就绪，使用本地数据:', err.message || err)
      })
    } catch (e) {
      console.warn('云开发未配置，使用本地数据')
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
  },

  /** 跳转初始化页面 */
  goInit() {
    wx.navigateTo({ url: '/pages/init/init' })
  },

  /** 跳转管理页面 */
  goManage() {
    wx.navigateTo({ url: '/pages/manage/manage' })
  },

  /** 从云数据库加载用户自定义食材和锅具 */
  async loadCustomData() {
    try {
      const db = wx.cloud.database()
      // 加载自定义食材（分页获取全部）
      getAllCollection(db.collection('custom_ingredients')).then(data => {
        if (data.length > 0) {
          const categories = this.data.ingredientCategories
          data.forEach(ci => {
            const catIndex = categories.findIndex(c => c.name === ci.category)
            if (catIndex > -1 && categories[catIndex].items.indexOf(ci.name) === -1) {
              categories[catIndex].items.push(ci.name)
            }
          })
          this.setData({ ingredientCategories: categories })
        }
      }).catch(() => {})

      // 加载自定义锅具（分页获取全部）
      getAllCollection(db.collection('custom_cookware')).then(data => {
        if (data.length > 0) {
          const customCookware = data.map(c => ({ name: c.name, icon: c.icon || '🍳' }))
          const existingNames = this.data.cookwareList.map(c => c.name)
          const newItems = customCookware.filter(c => existingNames.indexOf(c.name) === -1)
          if (newItems.length > 0) {
            this.setData({
              cookwareList: this.data.cookwareList.concat(newItems)
            })
          }
        }
      }).catch(() => {})
    } catch (e) {
      // 云开发未配置，忽略
    }
  },

  /** 显示快速添加食材弹窗 */
  showQuickAddIngredient() {
    const categories = this.data.ingredientCategories
    const catName = categories[this.data.activeCategory].name
    const catIndex = categories.findIndex(c => c.name === catName)
    this.setData({
      showAddIngredient: true,
      quickIngredientName: '',
      quickIngredientCategory: catName,
      quickCategoryIndex: catIndex
    })
  },

  hideQuickAddIngredient() {
    this.setData({ showAddIngredient: false })
  },

  onQuickIngredientInput(e) {
    this.setData({ quickIngredientName: e.detail.value })
  },

  onQuickCategoryChange(e) {
    const categories = this.data.ingredientCategories
    const idx = e.detail.value
    this.setData({
      quickIngredientCategory: categories[idx].name,
      quickCategoryIndex: idx
    })
  },

  /** 快速添加食材 */
  async quickAddIngredient() {
    const name = this.data.quickIngredientName
    const category = this.data.quickIngredientCategory
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入食材名称', icon: 'none' })
      return
    }

    try {
      const db = wx.cloud.database()
      await db.collection('custom_ingredients').add({
        data: {
          name: name.trim(),
          category: category,
          icon: '🍽',
          createdAt: db.serverDate()
        }
      })

      // 添加到当前列表中
      const categories = this.data.ingredientCategories
      const catIndex = categories.findIndex(c => c.name === category)
      if (catIndex > -1 && categories[catIndex].items.indexOf(name.trim()) === -1) {
        categories[catIndex].items.push(name.trim())
      }

      this.setData({
        ingredientCategories: categories,
        showAddIngredient: false,
        activeCategory: catIndex
      })
      wx.showToast({ title: '已添加', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  },

  /** 显示快速添加锅具弹窗 */
  showQuickAddCookware() {
    this.setData({
      showAddCookware: true,
      quickCookwareName: ''
    })
  },

  hideQuickAddCookware() {
    this.setData({ showAddCookware: false })
  },

  onQuickCookwareInput(e) {
    this.setData({ quickCookwareName: e.detail.value })
  },

  /** 快速添加锅具 */
  async quickAddCookware() {
    const name = this.data.quickCookwareName
    if (!name || !name.trim()) {
      wx.showToast({ title: '请输入锅具名称', icon: 'none' })
      return
    }

    try {
      const db = wx.cloud.database()
      await db.collection('custom_cookware').add({
        data: {
          name: name.trim(),
          icon: '🍳',
          createdAt: db.serverDate()
        }
      })

      const existingNames = this.data.cookwareList.map(c => c.name)
      if (existingNames.indexOf(name.trim()) === -1) {
        this.setData({ cookwareList: this.data.cookwareList.concat([{ name: name.trim(), icon: '🍳' }]) })
      }

      this.setData({ showAddCookware: false })
      wx.showToast({ title: '已添加', icon: 'success' })
    } catch (err) {
      wx.showToast({ title: '添加失败', icon: 'none' })
    }
  }
})
