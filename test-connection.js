const http = require('http');

// 测试本地服务器连接
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ 服务器连接成功！状态码: ${res.statusCode}`);
  console.log(`📍 服务器地址: http://localhost:3000`);
  console.log(`🌐 在浏览器中打开: http://localhost:3000`);
  process.exit(0);
});

req.on('error', (error) => {
  console.error('❌ 连接失败！');
  console.error(`错误信息: ${error.message}`);
  console.error('\n可能的原因:');
  console.error('1. 服务器未启动 - 请运行: npm start');
  console.error('2. 端口被占用 - 检查是否有其他应用使用端口 3000');
  console.error('3. 防火墙阻止 - 检查 Windows 防火墙设置');
  process.exit(1);
});

req.end();
