// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { wxUserInfo } = event
  const wxContext = cloud.getWXContext()
  console.log("ababab")
  try {
    // 根据openid检查用户是否存在
    const db = cloud.database()
    const userRes = await db.collection('users')
      .where({
        _openid: wxContext.OPENID
      })
      .get()
    if (userRes.data.length > 0) {
      // 用户已存在，返回用户信息和token
      const user = userRes.data[0]
      return {
        exists: true,
        user: user,
        token: `mock_token_${user._id}`
      }
    } else { 
      // 新用户
      return {
        exists: false
      }
    }
  } catch (error) {
    console.error('检查用户存在失败:', error)
    return {
      exists: false
    }
  }
}