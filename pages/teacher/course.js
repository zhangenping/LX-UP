// pages/teacher/course.js
Page({
  data: {
    course: null,
    teacher: null,
    loading: true,
    isSubscribed: false,
    subscriptionInfo: null,
    qrCodeImage: '' // 二维码图片
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

      if (res.data.length > 0) {
        this.setData({
          isSubscribed: true,
          subscriptionInfo: res.data[0]
        })
        // 生成二维码
        this.generateQRCode(res.data[0].verificationCode)
      }
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
      const userInfo = wx.getStorageSync('userInfo')
      
      // 调用云函数创建订阅
      const res = await wx.cloud.callFunction({
        name: 'createSubscription',
        data: {
          courseId: this.data.course._id,
          courseName: this.data.course.name,
          teacherName: this.data.teacher.name,
          price: this.data.course.price,
          studentName: userInfo.nickName || '学员' // 传递学生姓名
        }
      })

      wx.hideLoading()

      if (res.result.success) {
        wx.showToast({
          title: '订阅成功',
          icon: 'success'
        })
        
        // 更新订阅状态并生成二维码
        this.setData({
          isSubscribed: true,
          subscriptionInfo: res.result.subscription
        })
        
        // 生成二维码
        this.generateQRCode(res.result.subscription.verificationCode)
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

  // 生成二维码
  generateQRCode(verifyCode) {
    // 使用在线二维码生成服务
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(verifyCode)}`
    this.setData({
      qrCodeImage: qrCodeUrl
    })
    
    // 或者使用本地二维码生成库（需要引入）
    // this.generateLocalQRCode(verifyCode)
  },

  // 复制核销码
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

  // 保存二维码到相册
  onSaveQRCode() {
    if (!this.data.qrCodeImage) return
    
    wx.showLoading({ title: '保存中...' })
    
    wx.downloadFile({
      url: this.data.qrCodeImage,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: () => {
              wx.hideLoading()
              wx.showToast({
                title: '二维码已保存到相册',
                icon: 'success'
              })
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('保存失败:', err)
              wx.showToast({
                title: '保存失败，请授权相册权限',
                icon: 'none'
              })
            }
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('下载二维码失败:', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 分享课程
  onShareAppMessage() {
    return {
      title: this.data.course.name,
      path: `/pages/teacher/course?id=${this.data.course._id}`,
      imageUrl: this.data.teacher.avatar
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
  },

  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  }
})