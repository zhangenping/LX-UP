const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

function generateToken(openid) {
  // 这是一个简单的示例，实际应用中你可能需要使用更复杂的令牌生成机制
  return 'token_' + openid + '_' + Date.now()
}

exports.main = async (event) => {
  const { userInfo, phoneNumber, role } = event
  const wxContext = cloud.getWXContext()
  
  console.log('=== 调试信息 ===')
  console.log('OPENID:', wxContext.OPENID)
  console.log('角色:', role)
  
  try {
    const db = cloud.database()
    const _ = db.command
    
    // 1. 先检查用户是否存在
    console.log('🔍 检查用户是否存在...')
    const checkRes = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()
    
    console.log('✅ 查询结果:', checkRes.data.length, '条记录')
    
    let finalUser;
    
    if (checkRes.data.length === 0) {
      // 2. 用户不存在，创建新用户
      console.log('🆕 用户不存在，创建新用户...')
      finalUser = await createNewUser(db, _, wxContext.OPENID, userInfo, phoneNumber, role)
    } else {
      // 3. 用户存在，更新用户信息
      console.log('📝 用户存在，更新用户信息...')
      finalUser = await updateUser(db, _, wxContext.OPENID, userInfo, phoneNumber, role, checkRes.data[0])
    }
    
    const token = generateToken(wxContext.OPENID)
    
    return {
      success: true,
      user: finalUser,
      token: token
    }
    
  } catch (error) {
    console.error('❌ 云函数执行错误:', error)
    return {
      success: false,
      message: error.message
    }
  }
}

async function createNewUser(db, _, openid, userInfo, phoneNumber, role) {
  const userData = {
    _openid: openid,
    role: role,
    phone: phoneNumber,
    phoneVerified: !!phoneNumber,
    avatar: userInfo.avatarUrl,
    name: userInfo.nickName,
    lastLogin:  new Date(),
    status: role === 'teacher' ? 'pending' : 'approved'
  }
  
  console.log('📦 创建用户数据:', userData)
  
  // 执行创建
  const addResult = await db.collection('users').add({
    data: userData
  })
  
  console.log('✅ 创建操作完成, 新记录ID:', addResult._id)
  
  // 等待数据同步
  await new Promise(resolve => setTimeout(resolve, 300))
  
  // 验证创建结果
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get()
  
  if (userRes.data.length === 0) {
    throw new Error('用户创建失败: 创建后查询不到数据')
  }
  
  console.log('🔍 创建验证成功, 用户数据已保存')
  return userRes.data[0]
}

async function updateUser(db, _, openid, userInfo, phoneNumber, role, existingUser) {
  const updateData = {
    role: role,
    phone: phoneNumber,
    phoneVerified: !!phoneNumber,
    avatar: userInfo.avatarUrl,
    name: userInfo.nickName,
    lastLogin:  new Date(),
    status: role === 'teacher' ? 'pending' : 'approved'
  }
 
  console.log('📦 更新数据:', updateData)
  
  const updateResult = await db.collection('users').where({
    _openid: openid
  }).update({
    data: updateData
  })
  
  console.log('✅ 更新操作完成, 影响记录数:', updateResult.stats.updated)
  
  // 等待数据同步
  await new Promise(resolve => setTimeout(resolve, 300))

  // 获取更新后的数据
  const userRes = await db.collection('users').where({
    _openid: openid
  }).get()
  
  return userRes.data[0]
}
