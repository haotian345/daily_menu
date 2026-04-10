const recipesData = require('../../data/recipes.js')

Page({
  data: {
    status: '准备中...',
    progress: 0,
    total: 0,
    done: false,
    error: ''
  },

  onLoad() {
    this.initDatabase()
  },

  async initDatabase() {
    try {
      const db = wx.cloud.database()

      // 检查是否已有数据
      this.setData({ status: '检查数据库...' })
      const countRes = await db.collection('recipes').count()
      const totalCount = recipesData.length
      if (countRes.total >= totalCount) {
        this.setData({
          status: '数据库已有 ' + countRes.total + ' 道菜谱，无需重复导入',
          progress: countRes.total,
          total: countRes.total,
          done: true
        })
        return
      }
      if (countRes.total > 0 && countRes.total < totalCount) {
        this.setData({
          status: '检测到部分数据（' + countRes.total + '/' + totalCount + '），将补全缺失的菜谱'
        })
      }

      // 批量导入（如果已有部分数据，只导入缺失的）
      const total = recipesData.length
      this.setData({ total, status: '开始导入...' })

      // 查找已有的菜谱名称，避免重复导入
      let existingNames = new Set()
      if (countRes.total > 0) {
        const batchTimes = Math.ceil(countRes.total / 100)
        for (let i = 0; i < batchTimes; i++) {
          const res = await db.collection('recipes').skip(i * 100).limit(100).get()
          res.data.forEach(r => existingNames.add(r.name))
        }
      }

      const toImport = recipesData.filter(r => !existingNames.has(r.name))

      if (toImport.length === 0) {
        this.setData({
          done: true,
          progress: total,
          status: '数据已完整，共 ' + total + ' 道菜谱'
        })
        return
      }

      const batchSize = 20
      let imported = countRes.total

      for (let i = 0; i < toImport.length; i += batchSize) {
        const batch = toImport.slice(i, i + batchSize)
        const tasks = batch.map(recipe => db.collection('recipes').add({ data: recipe }))
        await Promise.all(tasks)
        imported += batch.length

        this.setData({
          progress: imported,
          status: '已导入 ' + imported + ' / ' + total + ' 道'
        })
      }

      this.setData({
        done: true,
        status: '导入完成！共 ' + imported + ' 道菜谱'
      })

    } catch (err) {
      this.setData({
        error: err.message || err.errMsg || '导入失败',
        status: '导入失败'
      })
      console.error('数据库初始化失败:', err)
    }
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  },

  retry() {
    this.setData({ status: '准备中...', progress: 0, done: false, error: '' })
    this.initDatabase()
  }
})
