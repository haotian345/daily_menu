// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 云函数入口函数 - 批量导入菜谱数据
exports.main = async (event, context) => {
  const { recipes } = event

  if (!recipes || !recipes.length) {
    return { code: 400, msg: '没有菜谱数据' }
  }

  try {
    // 批量写入，每次最多20条
    const batchSize = 20
    let successCount = 0

    for (let i = 0; i < recipes.length; i += batchSize) {
      const batch = recipes.slice(i, i + batchSize)
      const tasks = batch.map(recipe => {
        return db.collection('recipes').add({ data: recipe })
      })
      const results = await Promise.all(tasks)
      successCount += results.length
    }

    return {
      code: 200,
      msg: `成功导入 ${successCount} 道菜谱`
    }
  } catch (err) {
    return { code: 500, msg: err.message }
  }
}
