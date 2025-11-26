// pages/user/subscriptions/subscriptions.js
Page({
  data: {
    subscriptions: [],
    loading: true
  },

  onLoad() {
    this.loadSubscriptions()
  },

  onShow() {
    // 页面显示时重新加载数据，确保评论状态更新
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

      // 检查每个订阅的评论状态
      const subscriptionsWithCommentStatus = await Promise.all(
        res.data.map(async (subscription) => {
          try {
            // 检查是否已评论
            const commentRes = await db.collection('comments')
              .where({
                courseId: subscription.courseId,
                studentId: userInfo._openid
              })
              .get()
            
            return {
              ...subscription,
              hasCommented: commentRes.data.length > 0,
              canComment: subscription.status === 'completed'
            }
          } catch (error) {
            console.log('检查评论状态失败，默认设为未评论:', error)
            // 如果comments集合不存在或查询失败，默认设为未评论
            return {
              ...subscription,
              hasCommented: false,
              canComment: subscription.status === 'completed'
            }
          }
        })
      )

      this.setData({
        subscriptions: subscriptionsWithCommentStatus,
        loading: false
      })

      console.log('订阅列表加载完成:', subscriptionsWithCommentStatus)

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

  // 跳转到评论页面
  goToComment(e) {
    const subscription = e.currentTarget.dataset.subscription
    
    // 检查是否可以评论
    if (!subscription.canComment) {
      wx.showToast({
        title: '课程完成后才能评价',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/user/comment/comment?subscription=${encodeURIComponent(JSON.stringify(subscription))}`
    })
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }
})