Page({
    data: {
      userInfo: {},
      phoneNumber: '',
      verifyCode: '',
      countdown: 0,
      canGetCode: false,
      canSubmit: false
    },
  
    onLoad(options) {
      if (options.userInfo) {
        const userInfo = JSON.parse(decodeURIComponent(options.userInfo));
        this.setData({ userInfo });
      }
    },
  
    onPhoneInput(e) {
      const phoneNumber = e.detail.value;
      const canGetCode = this.validatePhoneNumber(phoneNumber);
      
      this.setData({
        phoneNumber,
        canGetCode,
        canSubmit: this.validateForm(phoneNumber, this.data.verifyCode)
      });
    },
  
    onCodeInput(e) {
      const verifyCode = e.detail.value;
      this.setData({
        verifyCode,
        canSubmit: this.validateForm(this.data.phoneNumber, verifyCode)
      });
    },
  
    validatePhoneNumber(phone) {
      return /^1[3-9]\d{9}$/.test(phone);
    },
  
    validateForm(phone, code) {
      return this.validatePhoneNumber(phone) && code.length === 6;
    },
  
    // 获取验证码
    getVerifyCode() {
        const { phoneNumber, canGetCode } = this.data;
        
        if (!canGetCode) {
          wx.showToast({
            title: '请输入正确的手机号',
            icon: 'none'
          });
          return;
        }
      
        wx.showLoading({ title: '发送中...' });
        
        wx.cloud.callFunction({
          name: 'sendSmsCode',
          data: {
            phoneNumber: phoneNumber,
            type: 'register'
          }
        }).then(res => {
          wx.hideLoading();
          console.log('云函数响应:', res);
          
          if (res.result && res.result.success) {
            // 显示验证码（开发环境）
            if (res.result.code) {
              console.log('验证码:', res.result.code);
              wx.showModal({
                title: '验证码已发送',
                content: `验证码：${res.result.code}（开发测试用）`,
                showCancel: false,
                confirmText: '知道了'
              });
            } else {
              wx.showToast({ 
                title: '验证码已发送',
                icon: 'success'
              });
            }
            
            this.startCountdown();
          } else {
            wx.showToast({
              title: res.result?.message || '发送失败',
              icon: 'none'
            });
          }
        }).catch(error => {
          wx.hideLoading();
          console.error('云函数调用失败:', error);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        });
      },
  
    startCountdown() {
      this.setData({ countdown: 60 });
      
      const timer = setInterval(() => {
        if (this.data.countdown <= 1) {
          clearInterval(timer);
          this.setData({ countdown: 0 });
        } else {
          this.setData({ countdown: this.data.countdown - 1 });
        }
      }, 1000);
    },
  
    // 验证并进入下一步
    async verifyAndNext() {
      if (!this.data.canSubmit) return;
  
      wx.showLoading({ title: '验证中...' });
  
      try {
        const res = await wx.cloud.callFunction({
          name: 'verifySmsCode',
          data: {
            phoneNumber: this.data.phoneNumber,
            code: this.data.verifyCode
          }
        });
  
        if (res.result.success) {
          // 验证成功，跳转到角色选择页面
          wx.navigateTo({
            url: `/pages/login/role-select?userInfo=${encodeURIComponent(JSON.stringify(this.data.userInfo))}&phone=${this.data.phoneNumber}`
          });
        } else {
          wx.showToast({
            title: res.result.message || '验证码错误',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.showToast({
          title: '验证失败，请重试',
          icon: 'none'
        });
      } finally {
        wx.hideLoading();
      }
    },
  
    showSkipConfirm() {
      wx.showModal({
        title: '跳过绑定',
        content: '绑定手机号可以更好地保护账号安全，确定要跳过吗？',
        confirmText: '确定跳过',
        cancelText: '继续绑定',
        success: (res) => {
          if (res.confirm) {
            // 跳过绑定，直接进入角色选择
            wx.navigateTo({
              url: `/pages/login/role-select?userInfo=${encodeURIComponent(JSON.stringify(this.data.userInfo))}`
            });
          }
        }
      });
    }
  });