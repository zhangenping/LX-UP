// pages/user/subscriptions/subscriptions.js
Page({
  data: {
    subscriptions: [],
    loading: true
  },

  onLoad() {
    this.loadSubscriptions()
  },

  async loadSubscriptions() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) {
        this.setData({ loading: false })
        return
      }

      const db = wx.cloud.database()
      
      // 获取订阅列表
      const res = await db.collection('subscriptions')
        .where({
          studentId: userInfo._openid
        })
        .orderBy('subscribedAt', 'desc')
        .get()

      this.setData({
        subscriptions: res.data,
        loading: false
      })

    } catch (error) {
      console.error('加载订阅列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  onNavigateBack() {
    wx.navigateBack()
  },

  // 查看课程详情
  onViewCourse(e) {
    const courseId = e.currentTarget.dataset.courseid
    wx.navigateTo({
      url: `/pages/teacher/course?id=${courseId}`
    })
  },

  // 查看核销码
  onViewVerifyCode(e) {
    const code = e.currentTarget.dataset.code
    wx.showModal({
      title: '课程核销码',
      content: code,
      showCancel: false,
      confirmText: '复制',
      success: (res) => {
        if (res.confirm) {
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
      }
    })
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }
})