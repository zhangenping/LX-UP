// pages/user/profile.js
// pages/my/index.js
Page({
  data: {
    userInfo: {},
    subscriptionCount: 0,
    verifyCodeCount: 0
  },

  onLoad() {
    this.loadUserData()
  },

  onShow() {
    this.loadUserStats()
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      this.setData({ userInfo })
    } else {
      // 如果没有用户信息，使用默认
      this.setData({
        userInfo: {
          nickName: '微信用户',
          avatarUrl: '/images/default-avatar.png'
        }
      })
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) return

      const db = wx.cloud.database()
      
      // 获取订阅数量
      const subscriptionRes = await db.collection('subscriptions')
        .where({
          studentId: userInfo._openid,
          status: 'active'
        })
        .get()

      // 获取核销码数量
      const verifyCodeRes = await db.collection('verify_codes')
        .where({
          studentId: userInfo._openid
        })
        .get()

      this.setData({
        subscriptionCount: subscriptionRes.data.length,
        verifyCodeCount: verifyCodeRes.data.length
      })

    } catch (error) {
      console.error('加载统计信息失败:', error)
    }
  },

  // 跳转到我的订阅
  goToSubscriptions() {
    wx.navigateTo({
      url: '/pages/my/subscriptions/subscriptions'
    })
  },

  // 跳转到我的核销码
  goToVerifyCodes() {
    wx.navigateTo({
      url: '/pages/my/verify-codes/verify-codes'
    })
  }
})