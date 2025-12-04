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

  // 加载评价数据 - 自动标记为已读
  async loadReviews() {
    if (this.data.loading) return
    
    this.setData({ loading: true })
    
    try {
      const db = wx.cloud.database()
      const skip = this.data.currentPage * this.data.pageSize
      
      // 1. 获取评价数据
      const res = await db.collection('comments')
        .where({ teacherId: this.data.teacherId })
        .orderBy('createdAt', 'desc')
        .skip(skip)
        .limit(this.data.pageSize)
        .get()

      const newReviews = res.data.map(comment => {
        // 确保 rating 是数字类型
        const rating = Number(comment.rating) || 0
        
        // 查看页面时自动标记为已读，直接在前端显示已读状态
        return {
          _id: comment._id,
          studentName: comment.studentName,
          studentAvatar: comment.studentAvatar,
          courseName: comment.courseName || '未知课程',
          rating: rating,
          content: comment.content,
          tags: comment.tags || [],
          isAnonymous: comment.isAnonymous,
          isRead: true, // 直接设置为已读
          createTime: this.formatTime(comment.createdAt)
        }
      })

      // 2. 批量更新数据库中的已读状态
      await this.markAllAsRead(res.data)

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

  // 批量标记所有评价为已读
  async markAllAsRead(comments) {
    try {
      const db = wx.cloud.database()
      const _ = db.command
      
      // 创建批量更新操作
      const updatePromises = comments
        .filter(comment => !comment.isRead) // 只更新未读的
        .map(comment => 
          db.collection('comments').doc(comment._id).update({
            data: { 
              isRead: true, 
              readAt: new Date() 
            }
          })
        )

      // 并行执行所有更新
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
        console.log(`已批量标记 ${updatePromises.length} 条评价为已读`)
      }

      // 通知上级页面更新未读数量
      this.notifyParentPage()

    } catch (error) {
      console.error('批量标记已读失败:', error)
      // 即使失败也不影响前端显示，继续执行
    }
  },

  // 通知上级页面更新未读状态
  notifyParentPage() {
    try {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        const prevPage = pages[pages.length - 2]
        // 如果有更新未读数量的方法就调用
        if (prevPage.updateUnreadCount) {
          prevPage.updateUnreadCount()
        }
        // 或者直接更新数据
        if (prevPage.setData) {
          prevPage.setData({
            'teacherInfo.unreadCount': 0
          })
        }
      }
    } catch (error) {
      console.error('通知上级页面失败:', error)
    }
  },

  // 计算统计信息
  calculateStats(reviews) {
    if (reviews.length === 0) return

    const totalRating = reviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0)
    const averageRating = parseFloat((totalRating / reviews.length).toFixed(1))

    const ratingDistribution = this.data.ratingDistribution.map(item => {
      const count = reviews.filter(review => Number(review.rating) === item.rating).length
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

  // 加载更多（已移除 markAsRead 方法）
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