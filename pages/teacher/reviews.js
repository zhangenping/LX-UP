// pages/teacher/reviews/reviews.js
Page({
  data: {
    teacherId: '',
    reviews: [],
    averageRating: 0,
    ratingDistribution: [
      { rating: 5, count: 0, percentage: 0 },
      { rating: 4, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 1, count: 0, percentage: 0 }
    ],
    loading: false,
    hasMore: true,
    pageSize: 10,
    currentPage: 0
  },

  onLoad(options) {
    const teacherId = options.id
    if (teacherId) {
      this.setData({ teacherId })
      this.loadReviews()
    }
  },

  onNavigateBack() {
    wx.navigateBack()
  },

  // 加载评价数据
  async loadReviews() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const skip = this.data.currentPage * this.data.pageSize
      
      const res = await db.collection('comments')
        .where({ teacherId: this.data.teacherId })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(this.data.pageSize)
        .get()

      const newReviews = res.data.map(comment => ({
        _id: comment._id,
        studentName: comment.studentName,
        studentAvatar: comment.studentAvatar,
        courseName: comment.courseName || '未知课程',
        rating: comment.rating,
        content: comment.content,
        tags: comment.tags || [],
        isAnonymous: comment.isAnonymous,
        isRead: comment.isRead || false,
        createTime: this.formatTime(comment.createdAt)
      }))

      const allReviews = this.data.currentPage === 0 ? newReviews : [...this.data.reviews, ...newReviews]
      
      this.setData({
        reviews: allReviews,
        loading: false,
        hasMore: newReviews.length === this.data.pageSize,
        currentPage: this.data.currentPage + 1
      })

      this.calculateStats(allReviews)

    } catch (error) {
      console.error('加载评价失败:', error)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  },

  // 计算统计信息
  calculateStats(reviews) {
    if (reviews.length === 0) return

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0)
    // 确保 averageRating 是数字类型
    const averageRating = parseFloat((totalRating / reviews.length).toFixed(1))

    const ratingDistribution = this.data.ratingDistribution.map(item => {
      const count = reviews.filter(review => review.rating === item.rating).length
      const percentage = (count / reviews.length) * 100
      return { ...item, count, percentage }
    })

    this.setData({ 
      averageRating: averageRating, 
      ratingDistribution: ratingDistribution 
    })
  },

  // 格式化时间
  formatTime(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    
    if (date.toDateString() === now.toDateString()) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
    
    if (date.getFullYear() === now.getFullYear()) {
      return `${(date.getMonth() + 1)}月${date.getDate()}日`
    }
    
    return `${date.getFullYear()}年${(date.getMonth() + 1)}月${date.getDate()}日`
  },

  // 标记为已读
  async markAsRead(e) {
    const reviewId = e.currentTarget.dataset.id
    if (!reviewId) return

    try {
      const db = wx.cloud.database()
      await db.collection('comments').doc(reviewId).update({
        data: { isRead: true, readAt: new Date() }
      })

      const reviews = this.data.reviews.map(review => 
        review._id === reviewId ? { ...review, isRead: true } : review
      )

      this.setData({ reviews })
      wx.showToast({ title: '标记已读', icon: 'success' })

      // 通知上级页面更新
      const pages = getCurrentPages()
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2]
        if (prevPage.checkUnreadReviews) prevPage.checkUnreadReviews()
      }

    } catch (error) {
      console.error('标记已读失败:', error)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 加载更多
  loadMoreReviews() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadReviews()
    }
  },

  onReachBottom() {
    this.loadMoreReviews()
  },

  onPullDownRefresh() {
    this.setData({ reviews: [], currentPage: 0, hasMore: true })
    this.loadReviews().finally(() => wx.stopPullDownRefresh())
  }
})