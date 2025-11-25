Page({
  data: {
    agreementChecked: false,
    // 添加一个标志来跟踪是否正在登录
    isLogging: false
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
      
      console.log('🔍 检查登录状态:', { token, userInfo });
      
      if (token && userInfo) {
        // 显示加载提示
        wx.showLoading({ title: '检查登录状态...' });
        
        try {
          // 验证token是否有效
          const valid = await this.validateToken(token);
          if (valid) {
            console.log('✅ token有效，自动登录');
            wx.hideLoading();
            this.redirectToMainPage(userInfo);
            return;
          } else {
            console.log('❌ token无效，需要重新登录');
            // 清除过期的存储
            wx.removeStorageSync('token');
            wx.removeStorageSync('userInfo');
          }
        } catch (error) {
          console.error('token验证失败:', error);
        } finally {
          wx.hideLoading();
        }
      } else {
        console.log('🔍 本地无登录信息，需要登录');
      }
    } catch (error) {
      console.log('登录状态检查异常:', error);
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
      console.error('validateToken云函数调用失败:', error);
      return false;
    }
  },

  // 完善的 wx.login 封装
  wxLoginWithTimeout() {
    return new Promise((resolve, reject) => {
      // 设置超时（10秒）
      const timeoutTimer = setTimeout(() => {
        reject(new Error('wx.login 超时，请检查网络连接'));
      }, 10000);

      console.log('🔹 开始调用 wx.login()...');
      
      wx.login({
        success: (res) => {
          clearTimeout(timeoutTimer);
          console.log('✅ wx.login 成功:', res);
          
          if (res.code) {
            resolve(res);
          } else {
            reject(new Error('未获取到登录code'));
          }
        },
        fail: (err) => {
          clearTimeout(timeoutTimer);
          console.error('❌ wx.login 失败:', err);
          reject(new Error('登录失败: ' + (err.errMsg || '未知错误')));
        },
        complete: () => {
          console.log('🔹 wx.login 调用完成');
        }
      });
    });
  },

  // 获取用户信息 - 必须在用户点击事件中调用
  onGetUserProfile() {
    console.log('🎯 onGetUserProfile 被调用了！');
    console.log('📊 当前 agreementChecked:', this.data.agreementChecked);
    
    if (!this.data.agreementChecked) {
      console.log('❌ 协议未同意，显示提示');
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }

    if (this.data.isLogging) {
      return; // 防止重复点击
    }

    console.log('✅ 协议已同意，继续登录流程');
    
    // 在用户点击事件中调用 getUserProfile
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userInfoRes) => {
        console.log('👤 用户信息授权成功');
        // 获取到用户信息后，继续登录流程
        this.handleWechatLogin(userInfoRes);
      },
      fail: (err) => {
        console.error('❌ 用户信息授权失败:', err);
        wx.showToast({
          title: '需要授权用户信息才能登录',
          icon: 'none'
        });
      }
    });
  },

  // 微信登录 - 修改为检查用户是否已注册
  async handleWechatLogin(userInfoRes) {
    this.setData({ isLogging: true });
    wx.showLoading({ title: '登录中...' });

    try {
      console.log('🎯 handleWechatLogin 被调用了！');
      console.log('👤 用户信息:', userInfoRes.userInfo);
      
      // 1. 获取微信登录凭证
      const loginRes = await this.wxLoginWithTimeout();
      console.log('获取到的code:', loginRes.code);
      
      // 2. 检查用户是否已注册
      const checkUserRes = await wx.cloud.callFunction({
        name: 'checkUserExists',
        data: {
          wxUserInfo: userInfoRes.userInfo
        }
      });

      if (checkUserRes.result.exists) {
        // 已注册用户 - 直接登录
        const { user, token } = checkUserRes.result;
        
        wx.hideLoading();
        this.setData({ isLogging: false });
        
        // 保存登录状态
        wx.setStorageSync('token', token);
        wx.setStorageSync('userInfo', user);
        
        console.log('✅ 自动登录成功，用户信息:', user);
        
        // 显示登录成功提示
        wx.showToast({
          title: '登录成功!',
          icon: 'success'
        });
        
        // 直接跳转到首页
        setTimeout(() => {
          this.redirectToMainPage(user);
        }, 500);
        
      } else {
        // 新用户 - 继续注册流程
        console.log('👤 新用户，需要注册');
        
        // 模拟新用户数据
        const mockUser = {
          _id: 'mock_user_id_' + Date.now(),
          _openid: 'mock_openid_' + Date.now(),
          name: userInfoRes.userInfo.nickName,
          avatar: userInfoRes.userInfo.avatarUrl,
          role: null,
          phone: null,
          isNewUser: true
        };
        
        wx.hideLoading();
        this.setData({ isLogging: false });
        
        // 保存临时用户信息，用于注册流程
        wx.setStorageSync('tempUserInfo', mockUser);
        
        console.log('✅ 登录成功，跳转到手机绑定');
        wx.showToast({
          title: '登录成功!',
          icon: 'success'
        });
        
        // 跳转到手机绑定页面
        setTimeout(() => {
          this.goToPhoneBinding(userInfoRes.userInfo);
        }, 1000);
      }
      
    } catch (error) {
      wx.hideLoading();
      this.setData({ isLogging: false });
      console.error('登录失败:', error);
      wx.showToast({ 
        title: error.message, 
        icon: 'none' 
      });
    }
  },

  // 跳转到手机绑定页面
  goToPhoneBinding(userInfo) {
    wx.navigateTo({
      url: `/pages/login/phone-binding?userInfo=${encodeURIComponent(JSON.stringify(userInfo))}`
    });
  },

  // 跳转到主页面
  redirectToMainPage(user) {
    console.log('🎯 跳转到主页，用户信息:', user);
    
    if (user.role === 'teacher') {
      // 老师根据审核状态跳转不同页面
      if (user.status === 'pending') {
        console.log('👨‍🏫 老师审核中，跳转到待审核页面');
        wx.redirectTo({ url: '/pages/index/index' });
      } else if (user.status === 'approved') {
        console.log('👨‍🏫 老师已审核，跳转到老师主页');
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        console.log('👨‍🏫 老师审核被拒，跳转到被拒页面');
        wx.redirectTo({ url: '/pages/index/index' });
      }
    } else {
      // 学生直接进入主页
      console.log('🎓 学生用户，跳转到学生主页');
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  // Switch 事件处理
  onAgreementChange(e) {
    console.log('🎯 onAgreementChange 被调用');
    console.log('e.detail:', e.detail);
    
    // switch 组件的 e.detail.value 是布尔值
    const isChecked = Boolean(e.detail.value);
    
    this.setData({
      agreementChecked: isChecked
    });
    
    console.log('✅ 更新成功，agreementChecked:', this.data.agreementChecked);
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
  },

  // 添加调试方法，用于清除登录状态
  clearLoginState() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('tempUserInfo');
    wx.showToast({
      title: '登录状态已清除',
      icon: 'success'
    });
    console.log('🧹 登录状态已清除');
  }
});