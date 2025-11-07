Page({
  data: {
    teachers: [],
    loading: true,
    searchValue: ''
  },

  onLoad() {
    this.loadTeachers()
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadTeachers()
  },

  async loadTeachers() {
    try {
      this.setData({ loading: true })
      
      const db = wx.cloud.database()
      const res = await db.collection('teachers')
        .where({
          status: 'approved'  // 只显示已审核通过的老师
        })
        .field({
          name: true,
          avatar: true,
          title: true,
          specialty: true,
          rating: true,
          studentCount: true
        })
        .get()

      this.setData({
        teachers: res.data,
        loading: false
      })
    } catch (error) {
      console.error('加载教师列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  onSearch(e) {
    const value = e.detail.value
    this.setData({ searchValue: value })
    // 这里可以添加搜索逻辑
  },

  onTeacherTap(e) {
    const teacherId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/teacher/detail?id=${teacherId}`
    })
  },

  onPullDownRefresh() {
    this.loadTeachers().then(() => {
      wx.stopPullDownRefresh()
    })
  }
})