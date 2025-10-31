Page({
    data: {
      inputId: '',
      showResult: false,
      loading: false,
      result: {
        success: false,
        message: ''
      }
    },
  
    // 输入框内容变化
    onInputChange(e) {
      this.setData({
        inputId: e.detail.value.trim(),
        showResult: false
      });
    },
  
    // 查询按钮点击
    searchById() {
      const id = this.data.inputId;
      
      if (!id) {
        wx.showToast({
          title: '请输入ID',
          icon: 'none'
        });
        return;
      }
  
      this.setData({ loading: true });
      
      // 调用云函数查询
      wx.cloud.callFunction({
        name: 'queryUserById',
        data: {
          id: parseInt(id)
        },
        success: (res) => {
          this.setData({ loading: false });
          
          if (res.result.success) {
            this.setData({
              showResult: true,
              result: {
                success: true,
                message: `ID: ${id} 对应的姓名是：${res.result.data.name}`
              }
            });
          } else {
            this.setData({
              showResult: true,
              result: {
                success: false,
                message: res.result.message || '未找到对应的用户信息'
              }
            });
          }
        },
        fail: (err) => {
          this.setData({ loading: false });
          this.setData({
            showResult: true,
            result: {
              success: false,
              message: '查询失败，请检查网络连接'
            }
          });
          console.error('云函数调用失败:', err);
        }
      });
    }
  });