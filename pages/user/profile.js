// pages/user/profile.js
Page({
  data: {
    userInfo: null,
    subscriptions: [],
    loading: true
  },

  onLoad() {
    this.loadUserInfo()
    this.loadSubscriptions()
  },

  onShow() {
    // 刷新订阅数据
    this.loadSubscriptions()
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo')
    this.setData({ userInfo })
  },

  async loadSubscriptions() {
    try {
      this.setData({ loading: true })
      
      const db = wx.cloud.database()
      const res = await db.collection('subscriptions')
        .where({
          studentId: wx.getStorageSync('userInfo')._openid,
          status: 'active'
        })
        .get()

      this.setData({
        subscriptions: res.data,
        loading: false
      })
    } catch (error) {
      console.error('加载订阅失败:', error)
      this.setData({ loading: false })
    }
  },

  onSubscriptionTap(e) {
    const subscriptionId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/user/subscriptions?id=${subscriptionId}`
    })
  },

  onCopyCode(e) {
    const code = e.currentTarget.dataset.code
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({
          title: '核销码已复制',
          icon: 'success'
        })
      }
    })
  }
})