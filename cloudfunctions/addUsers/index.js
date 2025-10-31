const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const users = [
      { id: 1001, name: "张三", age: 25, department: "技术部" },
      { id: 1002, name: "李四", age: 28, department: "市场部" },
      { id: 1003, name: "王五", age: 30, department: "人事部" },
      { id: 1004, name: "赵六", age: 26, department: "财务部" },
      { id: 1005, name: "钱七", age: 32, department: "技术部" }
    ];

    const result = await db.collection('users').add({
      data: users
    });

    return {
      success: true,
      message: `成功添加 ${users.length} 条用户数据`,
      data: result
    };
  } catch (err) {
    console.error('添加数据失败:', err);
    return {
      success: false,
      message: '添加数据失败: ' + err.message
    };
  }
};