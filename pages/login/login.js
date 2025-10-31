Page({
    data: {
      agreementChecked: false
    },
  
    onLoad() {
      // 检查是否已登录
      this.checkLoginStatus();
    },
  
    // 检查登录状态
    async checkLoginStatus() {
      try {
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync('userInfo');
        
        if (token && userInfo) {
          // 验证token是否有效
          const valid = await this.validateToken(token);
          if (valid) {
            this.redirectToMainPage(userInfo);
            return;
          }
        }
      } catch (error) {
        console.log('未登录或登录已过期');
      }
    },
  
    // 验证token
    async validateToken(token) {
      try {
        // 调用云函数验证token有效性
        const res = await wx.cloud.callFunction({
          name: 'validateToken',
          data: { token }
        });
        return res.result.valid;
      } catch (error) {
        return false;
      }
    },
  
    // 微信登录
    async handleWechatLogin() {
      if (!this.data.agreementChecked) {
        wx.showToast({
          title: '请先同意用户协议',
          icon: 'none'
        });
        return;
      }
  
      wx.showLoading({ title: '登录中...' });
  
      try {
        // 1. 获取微信登录凭证
        const loginRes = await wx.login();
        
        // 2. 获取用户信息授权
        const userInfoRes = await this.getUserProfile();
        
        // 3. 调用登录云函数
        const cloudRes = await wx.cloud.callFunction({
          name: 'wechatLogin',
          data: {
            code: loginRes.code,
            userInfo: userInfoRes.userInfo
          }
        });
  
        wx.hideLoading();
  
        if (cloudRes.result.success) {
          const { user, isNewUser, token } = cloudRes.result;
          
          // 保存登录状态
          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', user);
          
          if (isNewUser) {
            // 新用户需要绑定手机号和选择角色
            this.goToPhoneBinding(userInfoRes.userInfo);
          } else {
            // 老用户直接进入主页面
            this.redirectToMainPage(user);
          }
        } else {
          wx.showToast({
            title: cloudRes.result.message || '登录失败',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.hideLoading();
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
        console.error('登录失败:', error);
      }
    },
  
    // 获取用户信息
    getUserProfile() {
      return new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        });
      });
    },
  
    // 跳转到手机绑定页面
    goToPhoneBinding(userInfo) {
      wx.navigateTo({
        url: `/pages/login/phone-binding?userInfo=${encodeURIComponent(JSON.stringify(userInfo))}`
      });
    },
  
    // 跳转到主页面
    redirectToMainPage(user) {
      if (user.role === 'teacher') {
        // 老师根据审核状态跳转不同页面
        if (user.status === 'pending') {
          wx.redirectTo({ url: '/pages/teacher/pending' });
        } else if (user.status === 'approved') {
          wx.switchTab({ url: '/pages/teacher/index' });
        } else {
          wx.redirectTo({ url: '/pages/teacher/rejected' });
        }
      } else {
        // 学生直接进入主页
        wx.switchTab({ url: '/pages/student/index' });
      }
    },
  
    onAgreementChange(e) {
      this.setData({
        agreementChecked: e.detail.value.length > 0
      });
    },
  
    showUserAgreement() {
      wx.navigateTo({
        url: '/pages/agreement/user-agreement'
      });
    },
  
    showPrivacyPolicy() {
      wx.navigateTo({
        url: '/pages/agreement/privacy-policy'
      });
    }
  });