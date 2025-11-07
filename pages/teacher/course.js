// pages/teacher/course.js
Page({
  data: {
    course: null,
    teacher: null,
    loading: true,
    isSubscribed: false,
    subscriptionInfo: null
  },

  onLoad(options) {
    const courseId = options.id
    if (courseId) {
      this.loadCourseDetail(courseId)
      this.checkSubscription(courseId)
    }
  },

  async loadCourseDetail(courseId) {
    try {
      const db = wx.cloud.database()
      
      // 加载课程详情
      const courseRes = await db.collection('courses').doc(courseId).get()
      const course = courseRes.data
      
      // 加载教师信息
      const teacherRes = await db.collection('teachers').doc(course.teacherId).get()
      
      this.setData({
        course: course,
        teacher: teacherRes.data,
        loading: false
      })
    } catch (error) {
      console.error('加载课程详情失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async checkSubscription(courseId) {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo) return

      const db = wx.cloud.database()
      const res = await db.collection('subscriptions')
        .where({
          studentId: userInfo._openid,
          courseId: courseId,
          status: 'active'
        })
        .get()

      this.setData({
        isSubscribed: res.data.length > 0,
        subscriptionInfo: res.data[0] || null
      })
    } catch (error) {
      console.error('检查订阅状态失败:', error)
    }
  },

  onSubscribe() {
    const userInfo = wx.getStorageSync('userInfo')
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.showModal({
      title: '确认订阅',
      content: `确定要订阅《${this.data.course.name}》课程吗？\n价格：¥${this.data.course.price}`,
      success: async (res) => {
        if (res.confirm) {
          await this.createSubscription()
        }
      }
    })
  },

  async createSubscription() {
    wx.showLoading({ title: '订阅中...' })
    
    try {
      // 调用云函数创建订阅
      const res = await wx.cloud.callFunction({
        name: 'createSubscription',
        data: {
          courseId: this.data.course._id,
          courseName: this.data.course.name,
          teacherName: this.data.teacher.name,
          price: this.data.course.price
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '订阅成功',
          icon: 'success'
        })
        
        // 更新订阅状态
        this.setData({
          isSubscribed: true,
          subscriptionInfo: res.result.subscription
        })
      } else {
        wx.showToast({
          title: res.result.message || '订阅失败',
          icon: 'none'
        })
      }
    } catch (error) {
      wx.hideLoading()
      console.error('订阅失败:', error)
      wx.showToast({
        title: '订阅失败，请重试',
        icon: 'none'
      })
    }
  },

  onCopyVerificationCode() {
    if (this.data.subscriptionInfo) {
      wx.setClipboardData({
        data: this.data.subscriptionInfo.verificationCode,
        success: () => {
          wx.showToast({
            title: '核销码已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  onContactTeacher() {
    if (this.data.teacher.contact) {
      wx.makePhoneCall({
        phoneNumber: this.data.teacher.contact
      })
    }
  },

  onViewTeacher() {
    wx.navigateTo({
      url: `/pages/teacher/detail?id=${this.data.teacher._id}`
    })
  }
})