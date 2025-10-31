const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

exports.main = async (event, context) => {
  const { id } = event;
  
  console.log('开始查询用户，ID:', id);
  
  try {
    const result = await db.collection('users')
      .where({
        id: parseInt(id)
      })
      .get();
    
    console.log('查询结果:', result);
    
    if (result.data.length > 0) {
      const user = result.data[0];
      return {
        success: true,
        data: {
          name: user.name,
          department: user.department || '未设置',
          age: user.age || '未设置'
        }
      };
    } else {
      return {
        success: false,
        message: `未找到ID为 ${id} 的用户`
      };
    }
  } catch (err) {
    console.error('数据库查询错误:', err);
    return {
      success: false,
      message: '数据库查询异常: ' + err.message
    };
  }
};