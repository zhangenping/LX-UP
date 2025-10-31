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
    async getVerifyCode() {
      if (!this.data.canGetCode) return;
  
      wx.showLoading({ title: '发送中...' });
  
      try {
        const res = await wx.cloud.callFunction({
          name: 'sendSmsCode',
          data: {
            phoneNumber: this.data.phoneNumber,
            type: 'register'
          }
        });
  
        wx.hideLoading();
  
        if (res.result.success) {
          wx.showToast({ title: '验证码已发送' });
          this.startCountdown();
        } else {
          wx.showToast({
            title: res.result.message || '发送失败',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.hideLoading();
        wx.showToast({
          title: '发送失败，请重试',
          icon: 'none'
        });
      }
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
          name: 'verifyPhoneCode',
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