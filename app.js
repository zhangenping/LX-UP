// app.js
App({
    onLaunch: function () {
      // 初始化云开发
      wx.cloud.init({
        env: 'cloud1-2g99yaatd28972c1', // 替换为你的环境ID
        traceUser: true
      });
      this.checkLoginStatus();
    },

    // 全局登录状态检查
    async checkLoginStatus() {
      try {
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync('userInfo');
        
        if (token && userInfo) {
          // 验证token有效性
          const res = await wx.cloud.callFunction({
            name: 'validateToken',
            data: { token }
          });
          
          if (res.result.valid) {
            console.log('✅ 自动登录成功');
            // token有效，用户已登录
            this.globalData.isLoggedIn = true;
            this.globalData.userInfo = userInfo;
          } else {
            // token无效，清除本地存储
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
            this.globalData.isLoggedIn = false;
          }
        }
      } catch (error) {
        console.error('登录状态检查失败:', error);
        this.globalData.isLoggedIn = false;
      }
    },
  
    globalData: {
      isLoggedIn: false,
      userInfo: null
    }
  });