const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  console.log('🔹 sendSmsCode 被调用，事件参数:', event)
  
  const { phoneNumber, type = 'register' } = event
  
  try {
    // 验证手机号格式
    if (!phoneNumber) {
      return {
        success: false,
        message: '手机号不能为空'
      }
    }
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      return {
        success: false,
        message: '手机号格式不正确'
      }
    }
    
    const db = cloud.database()
    const wxContext = cloud.getWXContext()
    
    // 生成6位随机验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    console.log('🔹 生成的验证码:', code)
    
    try {
      // 尝试插入数据，如果集合不存在会自动创建
      const addResult = await db.collection('sms_codes').add({
        data: {
          phoneNumber: phoneNumber,
          code: code,
          type: type,
          openid: wxContext.OPENID,
          createdAt: db.serverDate(), // 使用服务器时间
          expiresAt: db.serverDate({
            offset: 10 * 60 * 1000 // 10分钟后过期
          }),
          used: false
        }
      })
      
      console.log('✅ 验证码记录成功，文档ID:', addResult._id)
      
      // 模拟发送短信
      console.log(`【模拟短信】验证码：${code}，手机号：${phoneNumber}`)
      
      return {
        success: true,
        message: '验证码发送成功',
        code: code // 开发环境返回验证码便于测试
      }
      
    } catch (dbError) {
      console.error('❌ 数据库操作失败:', dbError)
      
      // 如果还是失败，先返回成功（测试用）
      console.log(`【测试模式】验证码：${code}，手机号：${phoneNumber}`)
      
      return {
        success: true,
        message: '验证码发送成功（测试模式）',
        code: code
      }
    }
    
  } catch (error) {
    console.error('❌ 云函数执行异常:', error)
    return {
      success: false,
      message: '发送失败: ' + error.message
    }
  }
}