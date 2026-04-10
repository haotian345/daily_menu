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

      if (countRes.total > 0) {
        // 获取所有已有数据，检查是否有旧格式的 steps
        this.setData({ status: '检查数据格式...' })
        const batchTimes = Math.ceil(countRes.total / 100)
        let allExisting = []
        for (let i = 0; i < batchTimes; i++) {
          const res = await db.collection('recipes').skip(i * 100).limit(100).get()
          allExisting = allExisting.concat(res.data)
        }

        // 查找 steps 为字符串格式的旧数据，批量修复
        const needFix = allExisting.filter(r => r.steps.length > 0 && typeof r.steps[0] === 'string')
        if (needFix.length > 0) {
          this.setData({ status: '修复 ' + needFix.length + ' 道菜谱的数据格式...' })
          const fixBatchSize = 10
          for (let i = 0; i < needFix.length; i += fixBatchSize) {
            const batch = needFix.slice(i, i + fixBatchSize)
            await Promise.all(batch.map(r => db.collection('recipes').doc(r._id).update({
              data: {
                steps: r.steps.map(s => ({ description: s, image: '' }))
              }
            })))
            this.setData({
              progress: Math.min(i + fixBatchSize, needFix.length),
              total: needFix.length,
              status: '修复格式 ' + Math.min(i + fixBatchSize, needFix.length) + '/' + needFix.length
            })
          }
          console.log('已修复 ' + needFix.length + ' 道菜谱的 steps 格式')
        }

        // 检查是否需要补全缺失菜谱
        const existingNames = new Set(allExisting.map(r => r.name))
        const toImport = recipesData.filter(r => !existingNames.has(r.name))

        if (toImport.length === 0 && countRes.total >= totalCount) {
          this.setData({
            status: '数据库已完整（' + countRes.total + ' 道菜谱）',
            progress: countRes.total,
            total: countRes.total,
            done: true
          })
          return
        }

        if (toImport.length > 0) {
          this.setData({
            status: '补全缺失菜谱（' + toImport.length + ' 道）...'
          })
          const batchSize = 20
          let imported = countRes.total
          const total = recipesData.length
          this.setData({ total })

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
        }

        this.setData({
          done: true,
          status: '数据初始化完成！共 ' + Math.max(countRes.total, totalCount) + ' 道菜谱'
        })
        return
      }

      // 全新导入
      const total = recipesData.length
      this.setData({ total, status: '开始导入...' })
      const batchSize = 20
      let imported = 0

      for (let i = 0; i < total; i += batchSize) {
        const batch = recipesData.slice(i, i + batchSize)
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
