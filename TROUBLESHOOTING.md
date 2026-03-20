# 🎬 分镜生成器 - 连接问题诊断和解决方案

## 问题症状
- 错误信息: "Connection failed. If the problem persists, please check your internet connection or VPN"
- 应用无法正常加载或功能不可用

## 根本原因分析

### 1. **外部资源加载失败** ✅ 已修复
- Google Fonts (字体库)
- Font Awesome (图标库)
- CDN 资源需要网络连接

**解决方案**: 已将外部资源替换为本地备用方案和 emoji 图标

### 2. **服务器未启动**
如果你需要使用后端 API 功能，需要启动 Node.js 服务器

### 3. **端口被占用**
端口 3000 可能被其他应用占用

### 4. **防火墙/VPN 阻止**
Windows 防火墙或 VPN 可能阻止本地连接

---

## 快速开始指南

### 步骤 1: 安装依赖
```powershell
cd d:\xiaozhao\storyboard-app
npm install
```

### 步骤 2: 启动服务器
```powershell
npm start
```

你应该看到:
```
🎬 分镜生成服务器运行在 http://localhost:3000
📁 上传目录: D:\xiaozhao\storyboard-app\uploads
📁 输出目录: D:\xiaozhao\storyboard-app\outputs
```

### 步骤 3: 打开应用
在浏览器中访问: **http://localhost:3000**

---

## 故障排除

### 问题 1: "npm: 无法识别的命令"
**解决方案**: 安装 Node.js
- 下载: https://nodejs.org/
- 选择 LTS 版本
- 安装后重启终端

### 问题 2: "端口 3000 已被占用"
**解决方案 A**: 修改端口
编辑 `.env` 文件:
```
PORT=3001
```
然后访问: http://localhost:3001

**解决方案 B**: 查找占用端口的进程
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### 问题 3: "连接被拒绝"
**解决方案**: 检查防火墙
1. 打开 Windows Defender 防火墙
2. 允许 Node.js 通过防火墙
3. 或临时禁用防火墙测试

### 问题 4: "无法访问 localhost"
**尝试替代方案**:
- 使用 IP 地址: http://127.0.0.1:3000
- 检查是否有 VPN 干扰
- 重启浏览器

---

## 测试连接

运行诊断脚本:
```powershell
node test-connection.js
```

---

## 已进行的修复

✅ 移除了 Google Fonts 外部依赖
✅ 移除了 Font Awesome CDN 依赖
✅ 添加了本地字体备用方案
✅ 添加了 emoji 图标替代方案
✅ 修复了 package.json 中的版本冲突

---

## 功能说明

### 前端功能 (无需网络)
- ✅ 人物三视图上传
- ✅ 剧情脚本输入
- ✅ 分镜脚本生成
- ✅ 分镜图片生成
- ✅ 视频生成

### 后端 API (需要服务器运行)
- 📤 `/api/upload-character` - 上传人物视图
- 📝 `/api/submit-script` - 提交剧本
- 🎬 `/api/generate-storyboard` - 生成分镜
- 🖼️ `/api/generate-images` - 生成图片
- 🎥 `/api/generate-video` - 生成视频

---

## 需要帮助?

如果问题仍未解决:
1. 检查浏览器控制台 (F12) 的错误信息
2. 查看服务器终端的日志输出
3. 确保所有依赖已正确安装

祝你使用愉快! 🎉
