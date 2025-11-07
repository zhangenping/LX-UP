// pages/teacher/detail.js
Page({
  data: {
    teacher: null,
    activeTab: 'intro',
    courses: [],
    reviews: [],
    loading: true
  },

  onLoad(options) {
    const teacherId = options.id
    if (teacherId) {
      this.loadTeacherDetail(teacherId)
      this.loadTeacherCourses(teacherId)
      this.loadTeacherReviews(teacherId)
    }
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

  async loadTeacherReviews(teacherId) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('reviews')
        .where({
          teacherId: teacherId
        })
        .orderBy('createTime', 'desc')
        .limit(10)
        .get()

      this.setData({
        reviews: res.data
      })
    } catch (error) {
      console.error('加载评价失败:', error)
    }
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