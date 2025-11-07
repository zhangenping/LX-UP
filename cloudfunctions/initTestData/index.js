// initTestData 云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async () => {
  const db = cloud.database()
  const _ = db.command
  
  try {
  // 先清空现有数据
  console.log('开始清空现有数据...')
      
  // 清空教师表
  const teacherRes = await db.collection('teachers').where({_id: _.exists(true)}).remove()
  console.log(`清空教师表: ${teacherRes.stats.removed} 条记录`)

  // 清空课程表
  const courseRes = await db.collection('courses').where({_id: _.exists(true)}).remove()
  console.log(`清空课程表: ${courseRes.stats.removed} 条记录`)

  // 清空评价表
  const reviewRes = await db.collection('reviews').where({_id: _.exists(true)}).remove()
  console.log(`清空评价表: ${reviewRes.stats.removed} 条记录`)

  console.log('数据清空完成，开始插入测试数据...')

    // 1. 创建测试教师
    const teachers = [
      {
        name: "张老师",
        avatar: "https://example.com/teacher1.jpg",
        title: "高级数学教师",
        introduction: "10年教学经验，擅长启发式教学",
        specialty: "初中数学、奥数辅导",
        rating: 4.8,
        studentCount: 120,
        courseCount: 3,
        contact: "13800138001",
        status: "approved"
      },
      {
        name: "李老师", 
        avatar: "https://example.com/teacher2.jpg",
        title: "英语特级教师",
        introduction: "留学归国，纯正美式发音",
        specialty: "英语口语、雅思托福",
        rating: 4.9,
        studentCount: 85,
        courseCount: 2,
        contact: "13800138002",
        status: "approved"
      }
    ]
    
    // 2. 创建测试课程
    const courses = [
      {
        name: "初中数学提高班",
        description: "针对初中数学重点难点进行系统讲解",
        price: 299,
        hours: 20,
        level: "中级",
        studentCount: 45,
        rating: 4.7,
        schedule: [
          { day: "周一", time: "19:00-21:00" },
          { day: "周三", time: "19:00-21:00" }
        ],
        status: "active"
      },
      {
        name: "英语口语速成",
        description: "快速提升英语口语表达能力",
        price: 399,
        hours: 15,
        level: "初级", 
        studentCount: 32,
        rating: 4.8,
        schedule: [
          { day: "周二", time: "20:00-21:30" },
          { day: "周四", time: "20:00-21:30" }
        ],
        status: "active"
      }
    ]
    
    // 3. 创建测试评价
    const reviews = [
      {
        studentName: "小明",
        rating: 5,
        content: "张老师讲课非常清晰，数学成绩提高了20分！",
        createTime: new Date(),
        status: "approved"
      },
      {
        studentName: "小闪",
        rating: 5,
        content: "张老师讲课幽默风趣，深入浅出！",
        createTime: new Date(),
        status: "approved"
      },
      {
        studentName: "蜡笔", 
        rating: 4,
        content: "李老师口语很棒，就是课程进度有点快",
        createTime: new Date(),
        status: "approved"
      },
      {
        studentName: "小新", 
        rating: 4,
        content: "李老师口语很流利标准",
        createTime: new Date(),
        status: "approved"
      }
    ]
    
    // 插入数据
    const results = {}
    
    for (const teacher of teachers) {
      const res = await db.collection('teachers').add({ data: teacher })
      results.teacherIds = results.teacherIds || []
      results.teacherIds.push(res._id)
    }
    
    // 为课程设置教师ID
    if (results.teacherIds && results.teacherIds.length >= 2) {
      courses[0].teacherId = results.teacherIds[0] // 张老师的课程
      courses[1].teacherId = results.teacherIds[1] // 李老师的课程
      
      for (const course of courses) {
        const res = await db.collection('courses').add({ data: course })
        results.courseIds = results.courseIds || []
        results.courseIds.push(res._id)
      }
      
      // 为评价设置关联
      reviews[0].teacherId = results.teacherIds[0]
      reviews[0].courseId = results.courseIds[0]
      reviews[1].teacherId = results.teacherIds[0] 
      reviews[1].courseId = results.courseIds[0]
      reviews[2].teacherId = results.teacherIds[1]
      reviews[2].courseId = results.courseIds[1]
      reviews[3].teacherId = results.teacherIds[1]
      reviews[3].courseId = results.courseIds[1]
      
      for (const review of reviews) {
        await db.collection('reviews').add({ data: review })
      }
    }
    
    return {
      success: true,
      message: '测试数据创建成功',
      data: results
    }
    
  } catch (error) {
    console.error('初始化测试数据失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}