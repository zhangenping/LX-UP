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
    isLoading: true,
    // 新增课程管理相关数据
    courses: [],
    showCourseForm: false,
    courseFormData: {
      name: '',
      description: '',
      price: 0,
      hours: 0,
      level: '初级',
      schedule: [{ dayIndex: 0, time: '' }] // 使用 dayIndex 存储数字索引
    },
    dayOptions: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] // 星期选项
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
        // 加载教师的课程列表
        this.loadTeacherCourses(teacherInfo._id)
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

  // 新增：加载教师的课程列表
  async loadTeacherCourses(teacherId) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('courses')
        .where({
          teacherId: teacherId
        })
        .orderBy('createTime', 'desc')
        .get()

      this.setData({
        courses: res.data
      })
      console.log('加载课程列表成功:', res.data)
    } catch (error) {
      console.error('加载课程列表失败:', error)
    }
  },

  // 新增：显示课程表单
  onShowCourseForm() {
    if (!this.data.teacherInfo._id) {
      wx.showToast({
        title: '请先完善教师基本信息',
        icon: 'none'
      })
      return
    }
    
    this.setData({
      showCourseForm: true,
      courseFormData: {
        name: '',
        description: '',
        price: 0,
        hours: 0,
        level: '初级',
        schedule: [{ dayIndex: 0, time: '' }]
      }
    })
  },

  // 新增：隐藏课程表单
  onHideCourseForm() {
    this.setData({ showCourseForm: false })
  },

  // 新增：课程表单输入处理
  onCourseFormInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`courseFormData.${field}`]: value
    })
  },

  // 新增：课程数字输入处理
  onCourseNumberInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`courseFormData.${field}`]: Number(value) || 0
    })
  },

  // 新增：添加课程时间安排
  onAddSchedule() {
    const schedule = [...this.data.courseFormData.schedule]
    schedule.push({ dayIndex: 0, time: '' })
    
    this.setData({
      ['courseFormData.schedule']: schedule
    })
  },

  // 新增：删除课程时间安排
  onRemoveSchedule(e) {
    const index = e.currentTarget.dataset.index
    const schedule = [...this.data.courseFormData.schedule]
    
    if (schedule.length > 1) {
      schedule.splice(index, 1)
      this.setData({
        ['courseFormData.schedule']: schedule
      })
    }
  },

  // 新增：课程时间安排输入处理
  onScheduleInput(e) {
    const { index, field } = e.currentTarget.dataset
    const { value } = e.detail
    
    const schedule = [...this.data.courseFormData.schedule]
    
    if (field === 'day') {
      // 对于 picker，保存数字索引
      schedule[index].dayIndex = value
    } else {
      // 对于 input，直接保存值
      schedule[index][field] = value
    }
    
    this.setData({
      ['courseFormData.schedule']: schedule
    })
  },

  // 新增：提交课程信息
  async onSubmitCourse() {
    const { courseFormData, dayOptions } = this.data
    const { teacherInfo } = this.data

    // 验证必填字段
    if (!courseFormData.name || !courseFormData.description) {
      wx.showToast({
        title: '请填写课程名称和描述',
        icon: 'none'
      })
      return
    }

    if (courseFormData.price <= 0) {
      wx.showToast({
        title: '请设置合理的课程价格',
        icon: 'none'
      })
      return
    }

    if (courseFormData.hours <= 0) {
      wx.showToast({
        title: '请设置合理的课程时长',
        icon: 'none'
      })
      return
    }

    // 验证时间安排并转换数据格式
    const validSchedule = courseFormData.schedule
      .filter(item => item.time.trim() !== '')
      .map(item => ({
        day: dayOptions[item.dayIndex], // 将索引转换为中文星期
        time: item.time
      }))
    
    if (validSchedule.length === 0) {
      wx.showToast({
        title: '请至少设置一个有效的时间安排',
        icon: 'none'
      })
      return
    }

    wx.showLoading({
      title: '创建课程中...'
    })

    try {
      const db = wx.cloud.database()
      
      const courseData = {
        name: courseFormData.name,
        description: courseFormData.description,
        price: courseFormData.price,
        hours: courseFormData.hours,
        level: courseFormData.level,
        schedule: validSchedule,
        teacherId: teacherInfo._id,
        teacherName: teacherInfo.name,
        studentCount: 0,
        rating: 0,
        status: 'active',
        createTime: new Date()
      }

      await db.collection('courses').add({
        data: courseData
      })

      wx.hideLoading()
      wx.showToast({
        title: '课程创建成功',
        icon: 'success'
      })

      // 重新加载课程列表并隐藏表单
      this.loadTeacherCourses(teacherInfo._id)
      this.setData({ showCourseForm: false })

    } catch (error) {
      wx.hideLoading()
      console.error('创建课程失败:', error)
      wx.showToast({
        title: '创建课程失败',
        icon: 'none'
      })
    }
  },

  // 新增：删除课程
  onDeleteCourse(e) {
    const courseId = e.currentTarget.dataset.id
    const courseName = e.currentTarget.dataset.name
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除课程《${courseName}》吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          await this.deleteCourse(courseId)
        }
      }
    })
  },

  // 新增：执行删除课程
  async deleteCourse(courseId) {
    wx.showLoading({ title: '删除中...' })
    
    try {
      const db = wx.cloud.database()
      await db.collection('courses').doc(courseId).remove()
      
      wx.hideLoading()
      wx.showToast({
        title: '删除成功',
        icon: 'success'
      })
      
      // 重新加载课程列表
      this.loadTeacherCourses(this.data.teacherInfo._id)
    } catch (error) {
      wx.hideLoading()
      console.error('删除课程失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 原有的方法保持不变
  onFormInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    console.log(`输入字段 ${field}:`, value)
    this.setData({
      [`formData.${field}`]: value
    })
  },

  onNumberInput(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    console.log(`数字输入字段 ${field}:`, value)
    this.setData({
      [`formData.${field}`]: Number(value) || 0
    })
  },

  async chooseAvatar() {
    // 保持原有的头像选择逻辑
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

  async submitTeacherInfo() {
    // 保持原有的教师信息提交逻辑
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