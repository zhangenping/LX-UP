// app.js
App({
    onLaunch: function () {
      // 初始化云开发
      wx.cloud.init({
        env: 'cloud1-2g99yaatd28972c1', // 替换为你的环境ID
        traceUser: true
      });
    }
  });