const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { phoneNumber, code } = event
  
  try {
    if (!phoneNumber || !code) {
      return {
        success: false,
        message: '手机号和验证码不能为空'
      }
    }
    
    const db = cloud.database()
    const wxContext = cloud.getWXContext()
    const now = new Date()
    
    // 查找有效的验证码记录
    const codeRes = await db.collection('sms_codes')
      .where({
        phoneNumber: phoneNumber,
        code: code,
        openid: wxContext.OPENID,
        used: false,
        expiresAt: db.command.gt(now) // 未过期
      })
      .orderBy('createdAt', 'desc')
      .get()
    
    if (codeRes.data.length === 0) {
      return {
        success: false,
        message: '验证码错误或已过期'
      }
    }
    
    const codeRecord = codeRes.data[0]
    
    // 标记验证码为已使用
    await db.collection('sms_codes').doc(codeRecord._id).update({
      data: {
        used: true,
        usedAt: now
      }
    })
    
    return {
      success: true,
      message: '验证成功'
    }
    
  } catch (error) {
    console.error('验证验证码失败:', error)
    return {
      success: false,
      message: '验证失败，请重试'
    }
  }
}