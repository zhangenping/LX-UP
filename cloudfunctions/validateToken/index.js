// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const { token } = event
  
  try {
    // 简单的token验证逻辑
    // 在实际项目中，这里应该验证token签名和过期时间
    if (!token || !token.startsWith('mock_token_')) {
      return { valid: false }
    }
    
    // 从token中提取用户ID（简化版）
    const userId = token.replace('mock_token_', '')
    
    // 检查用户是否存在
    const db = cloud.database()
    const userRes = await db.collection('users').doc(userId).get()
    
    if (userRes.data) {
      return { 
        valid: true,
        user: userRes.data
      }
    } else {
      return { valid: false }
    }
  } catch (error) {
    console.error('Token验证失败:', error)
    return { valid: false }
  }
}