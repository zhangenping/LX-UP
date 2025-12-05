// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database()
  
  try {
    // 1. 获取所有已审核教师
    const teachersRes = await db.collection('teachers')
      .where({ status: 'approved' })
      .field({
        name: true,
        avatar: true,
        title: true,
        specialty: true,
        studentCount: true
      })
      .get()

    // 2. 批量查询每个教师的评价
    const teachersWithRatings = await Promise.all(
      teachersRes.data.map(async (teacher) => {
        try {
          // 查询该教师的所有评价
          const commentsRes = await db.collection('comments')
            .where({ teacherId: teacher._id })
            .field({ rating: true })
            .get()

          // 计算平均评分
          let rating = 5.0 // 默认值
          
          if (commentsRes.data.length > 0) {
            const totalRating = commentsRes.data.reduce((sum, comment) => {
              return sum + (Number(comment.rating) || 0)
            }, 0)
            
            rating = parseFloat((totalRating / commentsRes.data.length).toFixed(1))
          }

          return {
            ...teacher,
            rating: rating,
            reviewCount: commentsRes.data.length
          }
        } catch (error) {
          console.error(`计算教师 ${teacher.name} 评分失败:`, error)
          return {
            ...teacher,
            rating: 5.0,
            reviewCount: 0
          }
        }
      })
    )

    // 3. 按评分排序
    teachersWithRatings.sort((a, b) => b.rating - a.rating)

    return {
      success: true,
      data: teachersWithRatings,
      total: teachersWithRatings.length
    }
  } catch (error) {
    console.error('批量计算评分失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}