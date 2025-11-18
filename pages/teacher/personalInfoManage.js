// pages/teacher/manage/manage.js
Page({
  data: {
    formData: {
      name: '',
      specialty: '',
      introduction: '',
      avatar: '',
      rating: 5,
      studentCount: 0,
      contact: ''
    },
    teacherInfo: {},
    isLoading: true
  },

  onLoad() {
    this.loadTeacherInfo()
  },

  // 加载教师信息
  async loadTeacherInfo() {
    try {
      this.setData({ isLoading: true })
      
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) {
        console.log('未找到用户信息')
        this.setData({ isLoading: false })
        return
      }

      console.log('开始加载教师信息，openid:', userInfo._openid)

      const db = wx.cloud.database()
      const res = await db.collection('teachers')
        .where({
          _openid: userInfo._openid
        })
        .get()

      console.log('教师信息查询结果:', res)

      if (res.data.length > 0) {
        const teacherInfo = res.data[0]
        console.log('找到教师信息:', teacherInfo)
        
        this.setData({
          teacherInfo,
          formData: {
            name: teacherInfo.name || '',
            specialty: teacherInfo.specialty || '',
            introduction: teacherInfo.introduction || '',
            avatar: teacherInfo.avatar || userInfo.avatarUrl || '/images/default-avatar.png',
            rating: teacherInfo.rating || 5,
            studentCount: teacherInfo.studentCount || 0,
            contact: teacherInfo.contact || ''
          },
          isLoading: false
        })
        
        console.log('表单数据已更新:', this.data.formData)
      } else {
        console.log('未找到教师信息，使用默认值')
        // 如果没有教师信息，使用用户信息初始化
        this.setData({
          formData: {
            ...this.data.formData,
            avatar: userInfo.avatarUrl || '/images/default-avatar.png'
          },
          isLoading: false
        })
      }
    } catch (error) {
      console.error('加载教师信息失败:', error)
      wx.showToast({
        title: '加载信息失败',
        icon: 'none'
      })
      this.setData({ isLoading: false })
    }
  },

  // 表单输入处理
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    console.log(`输入字段 ${field}:`, value)
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 数字输入处理
  onNumberInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    console.log(`数字输入字段 ${field}:`, value)
    this.setData({
      [`formData.${field}`]: Number(value) || 0
    })
  },

  // 选择头像
  async chooseAvatar() {
    try {
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      if (res.tempFiles && res.tempFiles[0]) {
        wx.showLoading({
          title: '上传中...'
        })

        // 上传图片到云存储
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `teachers/avatar/${Date.now()}.jpg`,
          filePath: res.tempFiles[0].tempFilePath
        })

        // 获取图片链接
        const fileRes = await wx.cloud.getTempFileURL({
          fileList: [uploadRes.fileID]
        })

        this.setData({
          ['formData.avatar']: fileRes.fileList[0].tempFileURL
        })

        wx.hideLoading()
        wx.showToast({
          title: '头像上传成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('选择头像失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '头像上传失败',
        icon: 'none'
      })
    }
  },

  // 提交教师信息
  async submitTeacherInfo() {
    const { formData } = this.data
    const userInfo = wx.getStorageSync('userInfo')
    
    console.log('提交的表单数据:', formData)
    
    // 验证必填字段 - 现在只需要姓名和专长
    if (!formData.name || !formData.specialty) {
      wx.showToast({
        title: '请填写姓名和专长',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '保存中...'
    })

    try {
      const db = wx.cloud.database()
      
      // 检查是否已存在教师信息
      const checkRes = await db.collection('teachers')
        .where({
          _openid: userInfo._openid
        })
        .get()

      console.log('检查教师信息存在性:', checkRes)

      const teacherData = {
        name: formData.name,
        specialty: formData.specialty,
        introduction: formData.introduction || '',
        avatar: formData.avatar || userInfo.avatarUrl,
        rating: formData.rating,
        studentCount: formData.studentCount,
        contact: formData.contact || '',
      }

      if (checkRes.data.length > 0) {
        // 更新现有信息
        await db.collection('teachers').doc(checkRes.data[0]._id).update({
          data: teacherData
        })
        console.log('教师信息更新成功')
        wx.showToast({
          title: '信息更新成功',
          icon: 'success'
        })
      } else {
        // 创建新信息
        await db.collection('teachers').add({
          data: {
            ...teacherData,
            status: 'approved'
          }
        })
        console.log('教师信息创建成功')
        wx.showToast({
          title: '信息提交成功，等待审核',
          icon: 'success'
        })
      }

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)

    } catch (error) {
      console.error('保存教师信息失败:', error)
      wx.hideLoading()
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  },

  // 添加加载状态显示
  onReady() {
    // 如果加载时间较长，显示加载状态
    setTimeout(() => {
      if (this.data.isLoading) {
        wx.showToast({
          title: '加载中...',
          icon: 'loading',
          duration: 2000
        })
      }
    }, 1000)
  }
})