// pages/user/verify-codes/verify-codes.js
// pages/my/verify-codes/verify-codes.js
Page({
  data: {
    verifyCodes: [],
    loading: true
  },

  onLoad() {
    this.loadVerifyCodes()
  },

  async loadVerifyCodes() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo._openid) {
        this.setData({ loading: false })
        return
      }

      const db = wx.cloud.database()
      
      // 获取核销码列表
      const res = await db.collection('verify_codes')
        .where({
          studentId: userInfo._openid
        })
        .orderBy('createdAt', 'desc')
        .get()

      this.setData({
        verifyCodes: res.data,
        loading: false
      })

    } catch (error) {
      console.error('加载核销码失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 返回上一页
  onNavigateBack() {
    wx.navigateBack()
  },

  // 复制核销码
  onCopyCode(e) {
    const code = e.currentTarget.dataset.code
    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({
          title: '核销码已复制',
          icon: 'success'
        })
      }
    })
  },

  // 显示二维码
  onShowQRCode(e) {
    const code = e.currentTarget.dataset.code
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`
    
    wx.previewImage({
      urls: [qrCodeUrl],
      success: () => {
        wx.showToast({
          title: '长按保存二维码',
          icon: 'none'
        })
      }
    })
  },

  // 格式化日期
  formatDate(dateString) {
    if (!dateString) return ''
    const date = new Date(dateString)
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
  }
})