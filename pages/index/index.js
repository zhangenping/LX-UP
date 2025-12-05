Page({
  data: {
    teachers: [],
    loading: true,
    searchValue: ''
  },

  onLoad() {
    this.loadTeachersWithCloudFunction()
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadTeachersWithCloudFunction()
  },

  async loadTeachersWithCloudFunction() {
    try {
      this.setData({ loading: true })
      
      // 调用云函数批量计算评分
      const res = await wx.cloud.callFunction({
        name: 'batchCalculateRatings'
      })

      console.log('云函数返回数据:', res.result)

      if (res.result.success) {
        this.setData({
          teachers: res.result.data,
          loading: false
        })
      } else {
        throw new Error(res.result.message || '加载失败')
      }

    } catch (error) {
      console.error('加载教师列表失败:', error)
      this.setData({ 
        teachers: [],
        loading: false 
      })
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