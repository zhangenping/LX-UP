Page({
    data: {
      userInfo: {},
      phoneNumber: '',
      selectedRole: ''
    },
  
    onLoad(options) {
      if (options.userInfo) {
        const userInfo = JSON.parse(decodeURIComponent(options.userInfo));
        this.setData({ userInfo });
      }
      if (options.phone) {
        this.setData({ phoneNumber: options.phone });
      }
    },
  
    selectRole(e) {
      const role = e.currentTarget.dataset.role;
      
      if (role === 'teacher') {
        // 如果是选择老师，显示确认提示
        wx.showModal({
          title: '教师身份确认',
          content: '教师身份需要审核通过后才能使用完整功能，审核通常需要1-3个工作日。确定选择教师身份吗？',
          success: (res) => {
            if (res.confirm) {
              this.setData({ selectedRole: role });
            }
          }
        });
      } else {
        this.setData({ selectedRole: role });
      }
    },
  
    async confirmRole() {
      if (!this.data.selectedRole) return;
  
      wx.showLoading({ title: '注册中...' });
  
      try {
        const res = await wx.cloud.callFunction({
          name: 'completeRegistration',
          data: {
            userInfo: this.data.userInfo,
            phoneNumber: this.data.phoneNumber,
            role: this.data.selectedRole
          }
        });
  
        if (res.result.success) {
          const { user, token } = res.result;
          
          // 保存登录状态
          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', user);
          
          wx.hideLoading();
          
          // 根据角色和状态跳转
          this.redirectAfterRegistration(user);
        } else {
          wx.showToast({
            title: res.result.message || '注册失败',
            icon: 'none'
          });
        }
      } catch (error) {
        wx.hideLoading();
        wx.showToast({
          title: '注册失败，请重试',
          icon: 'none'
        });
        console.error('注册失败:', error);
      }
    },
  
    redirectAfterRegistration(user) {
      if (user.role === 'teacher') {
        if (user.status === 'pending') {
          // 老师待审核状态
          wx.redirectTo({
            url: '/pages/teacher/apply-success'
          });
        } else {
          wx.switchTab({
            url: '/pages/teacher/index'
          });
        }
      } else {
        console.log('注册为学生成功，跳转到主页')
        // 学生直接进入主页
        wx.switchTab({
          url: '/pages/index/index'
        });
      }
    }
  });