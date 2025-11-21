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
    showVerifyModal: false, // 是否显示核销弹窗
    verifyInput: '', // 核销码输入
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
          studentId: userInfo._openid
          // status: 'active'
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

  // 新增：显示核销弹窗
  showVerifyModal() {
    if (this.data.userRole !== 'teacher' || this.data.userStatus !== 'approved') {
      wx.showToast({
        title: '只有认证教师才能核销',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showVerifyModal: true,
      verifyInput: ''
    })
  },

  // 新增：隐藏核销弹窗
  hideVerifyModal() {
    this.setData({
      showVerifyModal: false,
      verifyInput: ''
    })
  },

  // 新增：核销码输入处理
  onVerifyInput(e) {
    this.setData({
      verifyInput: e.detail.value.trim()
    })
  },

  // 新增：执行核销
  async verifyCode() {
    const { verifyInput, teacherInfo } = this.data
    
    if (!verifyInput) {
      wx.showToast({
        title: '请输入核销码',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '核销中...'
    })

    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 查找对应的核销码
      const verifyRes = await db.collection('verify_codes')
        .where({
          code: verifyInput,
          status: 'active'
        })
        .get()

      if (verifyRes.data.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '核销码无效或已使用',
          icon: 'none'
        })
        return
      }

      const verifyCode = verifyRes.data[0]
      
      // 检查是否是当前教师的课程
      const courseRes = await db.collection('courses')
        .doc(verifyCode.courseId)
        .get()

      if (!courseRes.data || courseRes.data.teacherId !== teacherInfo._id) {
        wx.hideLoading()
        wx.showToast({
          title: '只能核销自己课程的核销码',
          icon: 'none'
        })
        return
      }

      // 更新核销码状态
      await db.collection('verify_codes').doc(verifyCode._id).update({
        data: {
          status: 'used',
          usedTime: new Date(),
          verifiedBy: teacherInfo._id,
          verifiedByName: teacherInfo.name
        }
      })

      // 更新订阅状态
      await db.collection('subscriptions').doc(verifyCode.subscriptionId).update({
        data: {
          status: 'completed',
          completedTime: new Date()
        }
      })

      // 更新课程学生数量
      await db.collection('courses').doc(verifyCode.courseId).update({
        data: {
          studentCount: _.inc(1)
        }
      })

      // 更新教师学生数量
      await db.collection('teachers').doc(teacherInfo._id).update({
        data: {
          studentCount: _.inc(1)
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '核销成功',
        icon: 'success'
      })

      // 关闭弹窗并重置输入
      this.setData({
        showVerifyModal: false,
        verifyInput: ''
      })

      // 重新加载教师信息
      this.loadTeacherInfo()

    } catch (error) {
      wx.hideLoading()
      console.error('核销失败:', error)
      wx.showToast({
        title: '核销失败，请重试',
        icon: 'none'
      })
    }
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
      url: '/pages/user/subscriptions/subscriptions'
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
      url: '/pages/user/verify-codes/verify-codes'
    })
  }
})