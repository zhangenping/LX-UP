// createSubscription 云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event) => {
  const db = cloud.database()
  const _ = db.command
  
  try {
    const { courseId, courseName, teacherName, teacherId, price } = event
    const wxContext = cloud.getWXContext()
    const studentId = wxContext.OPENID
    
    if (!studentId) {
      return { success: false, message: '用户未登录' }
    }
    
    // 1. 检查是否已经订阅
    const existingSubs = await db.collection('subscriptions')
      .where({
        studentId: studentId,
        courseId: courseId,
        status: 'active'
      })
      .get()
    
    if (existingSubs.data.length > 0) {
      return { 
        success: false, 
        message: '您已经订阅过该课程',
        subscription: existingSubs.data[0]
      }
    }
    
    // 2. 生成核销码
    const verifyCode = generateVerifyCode()
    
    // 3. 创建订阅记录
    const subscriptionData = {
      studentId: studentId,
      courseId: courseId,
      courseName: courseName,
      teacherName: teacherName,
      teacherId: teacherId,
      price: price,
      verificationCode: verifyCode,
      status: 'active',
      subscribedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1年后过期
    }
    
    const subscriptionRes = await db.collection('subscriptions').add({ 
      data: subscriptionData 
    })
    
    // 4. 在核销码表中也创建记录（用于教师核销）
    const verifyCodeData = {
      code: verifyCode,
      subscriptionId: subscriptionRes._id,
      courseId: courseId,
      courseName: courseName,
      studentId: studentId,
      studentName: event.studentName || '学员', // 可以从用户信息获取
      usageLimit: 1, // 默认使用1次
      usedCount: 0,
      status: 'active',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
    
    await db.collection('verify_codes').add({ data: verifyCodeData })
    
    return {
      success: true,
      message: '订阅成功',
      subscription: {
        ...subscriptionData,
        _id: subscriptionRes._id
      }
    }
    
  } catch (error) {
    console.error('创建订阅失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

// 生成6位随机核销码
function generateVerifyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}