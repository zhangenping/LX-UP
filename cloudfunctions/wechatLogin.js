const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event) => {
  const { code, userInfo } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // 这里应该调用微信接口通过code获取openid
    // 简化处理，直接使用云开发提供的openid
    const openid = wxContext.OPENID
    
    const db = cloud.database()
    
    // 检查用户是否已存在
    const userRes = await db.collection('users').where({
      _openid: openid
    }).get()
    
    if (userRes.data.length > 0) {
      // 老用户，更新最后登录时间
      const user = userRes.data[0]
      await db.collection('users').where({
        _openid: openid
      }).update({
        data: {
          lastLogin: new Date(),
          avatar: userInfo.avatarUrl,
          name: userInfo.nickName
        }
      })
      
      return {
        success: true,
        isNewUser: false,
        user: { ...user, lastLogin: new Date() },
        token: generateToken(openid)
      }
    } else {
      // 新用户，创建记录但不完整（等待后续步骤）
      const newUser = {
        _openid: openid,
        avatar: userInfo.avatarUrl,
        name: userInfo.nickName,
        lastLogin: new Date(),
        createdAt: new Date()
      }
      
      await db.collection('users').add({
        data: newUser
      })
      
      return {
        success: true,
        isNewUser: true,
        user: newUser,
        token: generateToken(openid)
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error.message
    }
  }
}

function generateToken(openid) {
  // 实际项目中应该使用更安全的token生成方式
  return cloud.getWXContext().OPENID + '_' + Date.now()
}