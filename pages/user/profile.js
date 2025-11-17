// pages/user/profile.js
Page({
  data: {
    userInfo: {},
    subscriptionCount: 0,
    verifyCodeCount: 0,
    userRole: 'student', // 用户角色：student/teacher
    userStatus: 'active', // 用户状态：active/pending/approved/rejected
    teacherInfo: {}, // 教师个人信息
    showTeacherForm: false, // 是否显示教师信息表单
    formData: {
      name: '',
      title: '',
      specialty: '',
      introduction: '',
      avatar: '',
      rating: 5,
      studentCount: 0,
      teachingAge: '',
      contact: ''
    }
  },

  onLoad() {
    this.loadUserData()
  },

  onShow() {
    this.loadUserStats()
    this.checkUserRoleAndStatus()
    this.loadTeacherInfo()
  },

  // 加载用户数据
  loadUserData() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      console.log("加载数据成功")
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

  // 检查用户角色和状态
  checkUserRoleAndStatus() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo && userInfo.role) {
      this.setData({
        userRole: userInfo.role,
        userStatus: userInfo.status || 'active'
      })
    } else {
      // 默认学生身份
      this.setData({
        userRole: 'student',
        userStatus: 'active'
      })
    }
  },

  // 加载教师信息
  async loadTeacherInfo() {
    if (this.data.userRole !== 'teacher') return
    
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) return

      const db = wx.cloud.database()
      const res = await db.collection('teachers')
        .where({
          _openid: userInfo._openid
        })
        .get()

      if (res.data.length > 0) {
        this.setData({
          teacherInfo: res.data[0]
        })
      }
    } catch (error) {
      console.error('加载教师信息失败:', error)
    }
  },

  // 加载用户统计
  async loadUserStats() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) return

      // 如果是教师身份且未审核通过，不加载学生相关的统计数据
      if (this.data.userRole === 'teacher' && this.data.userStatus !== 'approved') {
        this.setData({
          subscriptionCount: 0,
          verifyCodeCount: 0
        })
        return
      }

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

  // 显示教师信息表单
  showTeacherInfoForm() {
    if (this.data.userRole !== 'teacher') return
  
    wx.navigateTo({
      url: '/pages/teacher/personalInfoManage'
    })
  }, 

  // 跳转到我的订阅
  goToSubscriptions() {
    // 如果是教师身份且未审核通过，禁用跳转
    if (this.data.userRole === 'teacher' && this.data.userStatus !== 'approved') {
      wx.showToast({
        title: '审核通过后可使用此功能',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/my/subscriptions/subscriptions'
    })
  },

  // 跳转到我的核销码
  goToVerifyCodes() {
    // 如果是教师身份且未审核通过，禁用跳转
    if (this.data.userRole === 'teacher' && this.data.userStatus !== 'approved') {
      wx.showToast({
        title: '审核通过后可使用此功能',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '/pages/my/verify-codes/verify-codes'
    })
  }
})