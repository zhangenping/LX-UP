// pages/teacher/detail.js
Page({
  data: {
    teacher: null,
    activeTab: 'intro',
    courses: [],
    reviews: [], // 这里存储评价数据
    loading: true
  },

  onLoad(options) {
    const teacherId = options.id
    if (teacherId) {
      this.loadTeacherDetail(teacherId)
      this.loadTeacherCourses(teacherId)
      this.loadTeacherReviews(teacherId) // 加载评价数据
    }
  },

  onNavigateBack() {
    wx.navigateBack()
  },

  async loadTeacherDetail(teacherId) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('teachers').doc(teacherId).get()
      
      this.setData({
        teacher: res.data,
        loading: false
      })
    } catch (error) {
      console.error('加载教师详情失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  async loadTeacherCourses(teacherId) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('courses')
        .where({
          teacherId: teacherId,
          status: 'active'
        })
        .get()

      this.setData({
        courses: res.data
      })
    } catch (error) {
      console.error('加载课程失败:', error)
    }
  },

  // 修改：从 comments 集合加载评价数据
  async loadTeacherReviews(teacherId) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('comments')
        .where({
          teacherId: teacherId
        })
        .orderBy('createdAt', 'desc') // 按创建时间倒序
        .limit(20) // 限制数量
        .get()

      console.log('加载到的评价数据:', res.data)

      // 格式化评价数据
      const reviews = res.data.map(comment => ({
        _id: comment._id,
        studentName: comment.studentName,
        studentAvatar: comment.studentAvatar,
        courseName: comment.courseName, // 显示课程名称
        rating: comment.rating,
        content: comment.content,
        tags: comment.tags || [],
        isAnonymous: comment.isAnonymous,
        createTime: this.formatTime(comment.createdAt),
        createdAt: comment.createdAt
      }))

      this.setData({
        reviews: reviews
      })

    } catch (error) {
      console.error('加载评价失败:', error)
      // 如果 comments 集合不存在，显示空状态
      this.setData({
        reviews: []
      })
    }
  },

  // 格式化时间
  formatTime(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    
    // 如果是今天
    if (date.toDateString() === now.toDateString()) {
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    
    // 如果是今年
    if (date.getFullYear() === now.getFullYear()) {
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
    }
    
    // 其他情况
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
  },

  onTabChange(e) {
    this.setData({
      activeTab: e.detail.name
    })
  },

  onSubscribeCourse(e) {
    console.log('点击了预约课程按钮')
  
    if (this.data.courses.length === 0) {
      wx.showToast({
        title: '暂无可用课程',
        icon: 'none'
      })
      return
    }
  
    // 让用户选择要预约的课程
    const courseNames = this.data.courses.map(course => course.name)
    
    wx.showActionSheet({
      itemList: courseNames,
      success: (res) => {
        const courseIndex = res.tapIndex
        const selectedCourse = this.data.courses[courseIndex]
        console.log('用户选择了课程:', selectedCourse.name, 'ID:', selectedCourse._id)
        
        // 跳转到课程详情页面
        wx.navigateTo({
          url: `/pages/teacher/course?id=${selectedCourse._id}`
        })
      },
      fail: (err) => {
        console.log('用户取消了选择')
      }
    })
  },

  onContactTeacher() {
    if (this.data.teacher.contact) {
      wx.makePhoneCall({
        phoneNumber: this.data.teacher.contact
      })
    }
  }
})