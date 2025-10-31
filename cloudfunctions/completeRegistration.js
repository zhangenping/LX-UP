const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { userInfo, phoneNumber, role } = event
  const wxContext = cloud.getWXContext()
  
  try {
    const db = cloud.database()
    
    // 更新用户完整信息
    const userData = {
      role: role,
      phone: phoneNumber,
      phoneVerified: !!phoneNumber,
      avatar: userInfo.avatarUrl,
      name: userInfo.nickName,
      lastLogin: new Date(),
      // 如果是老师，设置待审核状态
      status: role === 'teacher' ? 'pending' : 'approved',
      applyTime: role === 'teacher' ? new Date() : null
    }
    
    await db.collection('users').where({
      _openid: wxContext.OPENID
    }).update({
      data: userData
    })
    
    // 获取更新后的用户信息
    const userRes = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    return {
      success: true,
      user: userRes.data[0],
      token: generateToken(wxContext.OPENID)
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}