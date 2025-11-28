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
    scanType: 'manual', // manual-手动输入, scan-扫码
    unreadReviewCount: 0, // 新增：未读评价数量
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
    this.checkUnreadReviews() // 新增：检查未读评价
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

  // 新增：检查未读评价
  async checkUnreadReviews() {
    if (this.data.userRole !== 'teacher' || this.data.userStatus !== 'approved') return
    
    try {
      const db = wx.cloud.database()
      const res = await db.collection('comments')
        .where({
          teacherId: this.data.teacherInfo._id,
          isRead: false  // 假设有已读状态字段
        })
        .count()
      
      this.setData({ 
        unreadReviewCount: res.total 
      })
    } catch (error) {
      console.error('检查未读评价失败:', error)
      // 如果 comments 表没有 isRead 字段，可以忽略这个错误
    }
  },

  // 新增：跳转到评价页面
  navigateToReviews() {
    if (!this.data.teacherInfo || !this.data.teacherInfo._id) {
      wx.showToast({
        title: '请先完善教师信息',
        icon: 'none'
      })
      return
    }
    
    wx.navigateTo({
      url: `/pages/teacher/reviews?id=${this.data.teacherInfo._id}`
    })
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

  // 显示核销弹窗
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
      verifyInput: '',
      scanType: 'manual'
    })
  },

  // 隐藏核销弹窗
  hideVerifyModal() {
    this.setData({
      showVerifyModal: false,
      verifyInput: ''
    })
  },

  // 切换输入方式
  switchScanType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      scanType: type,
      verifyInput: ''
    })
    
    if (type === 'scan') {
      this.startScan()
    }
  },

  // 开始扫码
  async startScan() {
    try {
      // 检查相机权限
      const authRes = await wx.getSetting()
      if (!authRes.authSetting['scope.camera']) {
        // 没有权限，请求权限
        await wx.authorize({
          scope: 'scope.camera'
        })
      }

      // 开始扫码
      const scanRes = await wx.scanCode({
        onlyFromCamera: true,
        scanType: ['qrCode', 'barCode']
      })

      console.log('扫码结果:', scanRes)
      
      if (scanRes.result) {
        this.setData({
          verifyInput: scanRes.result
        })
        // 自动核销
        this.verifyCode()
      }

    } catch (error) {
      console.error('扫码失败:', error)
      
      if (error.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要相机权限',
          content: '扫码需要相机权限，请在设置中开启',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting()
            } else {
              // 用户拒绝授权，切换回手动输入
              this.setData({ scanType: 'manual' })
            }
          }
        })
      } else if (error.errMsg.includes('scanCode fail')) {
        wx.showToast({
          title: '扫码失败，请重试',
          icon: 'none'
        })
        // 扫码失败后自动切换回手动输入
        this.setData({ scanType: 'manual' })
      }
    }
  },

  // 核销码输入处理
  onVerifyInput(e) {
    this.setData({
      verifyInput: e.detail.value.trim()
    })
  },

  // 执行核销
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
      
      console.log('开始核销，输入码:', verifyInput)
      console.log('教师ID:', teacherInfo._id)

      // 查找对应的核销码
      let verifyRes
      try {
        verifyRes = await db.collection('verify_codes')
          .where({
            code: verifyInput,
            status: 'active'
          })
          .get()
        console.log('verify_codes 查询结果:', verifyRes)
      } catch (error) {
        console.log('verify_codes 查询失败，尝试 subscriptions 表:', error)
        // 如果 verify_codes 不存在，尝试在 subscriptions 表中查找
        verifyRes = await db.collection('subscriptions')
          .where({
            verificationCode: verifyInput,
            status: 'active'
          })
          .get()
        console.log('subscriptions 查询结果:', verifyRes)
      }

      if (verifyRes.data.length === 0) {
        wx.hideLoading()
        wx.showToast({
          title: '核销码无效或已使用',
          icon: 'none'
        })
        return
      }

      const verifyRecord = verifyRes.data[0]
      console.log('找到核销记录:', verifyRecord)

      // 检查是否是当前教师的课程
      const courseRes = await db.collection('courses')
        .doc(verifyRecord.courseId || verifyRecord.course._id)
        .get()

      console.log('课程信息:', courseRes.data)

      if (!courseRes.data || courseRes.data.teacherId !== teacherInfo._id) {
        wx.hideLoading()
        wx.showToast({
          title: '只能核销自己课程的核销码',
          icon: 'none'
        })
        return
      }

      // 更新数据 - 根据不同的集合结构进行处理
      if (verifyRes.data[0].collectionName === 'verify_codes' || verifyRecord.code) {
        // 如果是 verify_codes 集合的结构
        await db.collection('verify_codes').doc(verifyRecord._id).update({
          data: {
            status: 'used',
            usedTime: new Date(),
            verifiedBy: teacherInfo._id,
            verifiedByName: teacherInfo.name
          }
        })
        console.log('verify_codes 更新成功')

        // 更新订阅状态
        await db.collection('subscriptions').doc(verifyRecord.subscriptionId).update({
          data: {
            status: 'completed',
            completedTime: new Date()
          }
        })
        console.log('subscriptions 更新成功')
      } else {
        // 如果是 subscriptions 集合的结构（核销码直接存储在 subscriptions 中）
        await db.collection('subscriptions').doc(verifyRecord._id).update({
          data: {
            status: 'completed',
            completedTime: new Date(),
            verifiedBy: teacherInfo._id,
            verifiedByName: teacherInfo.name
          }
        })
        console.log('subscriptions 直接更新成功')
      }

      // 更新课程学生数量
      await db.collection('courses').doc(verifyRecord.courseId || verifyRecord.course._id).update({
        data: {
          studentCount: _.inc(1)
        }
      })
      console.log('课程学生数更新成功')

      // 更新教师学生数量
      await db.collection('teachers').doc(teacherInfo._id).update({
        data: {
          studentCount: _.inc(1)
        }
      })
      console.log('教师学生数更新成功')

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
        title: '核销失败: ' + error.message,
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