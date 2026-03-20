# 🗄️ 数据库配置和使用指南

## 概述

AI 分镜生成器支持两种数据存储方式：

1. **文件存储** (默认) - 使用 JSON 文件存储项目数据
2. **MongoDB** - 使用 MongoDB 数据库存储项目数据

系统会自动选择可用的存储方式，如果 MongoDB 不可用，会自动降级到文件存储。

---

## 文件存储模式

### 特点

✅ **优点**
- 无需额外配置
- 开箱即用
- 适合小规模项目
- 数据易于备份和迁移

⚠️ **限制**
- 并发性能有限
- 不适合大规模应用
- 单机存储

### 配置

编辑 `.env` 文件：

```env
STORAGE_MODE=file
```

### 文件位置

- **项目数据**: `./projects.json`
- **备份目录**: `./backups/`
- **上传文件**: `./uploads/`
- **输出文件**: `./outputs/`

### 自动备份

系统会每小时自动备份项目数据到 `./backups/` 目录，最多保留 10 个备份。

---

## MongoDB 存储模式

### 安装 MongoDB

#### Windows

1. 下载 MongoDB Community Edition
   - 访问: https://www.mongodb.com/try/download/community

2. 运行安装程序
   - 选择 "Install MongoDB as a Service"
   - 完成安装

3. 验证安装
   ```powershell
   mongod --version
   ```

#### macOS

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu)

```bash
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

### 配置

编辑 `.env` 文件：

```env
STORAGE_MODE=mongodb
MONGODB_URI=mongodb://localhost:27017/storyboard-app
```

### 启动 MongoDB

#### Windows

```powershell
# 如果安装为服务，会自动启动
# 或手动启动
mongod
```

#### macOS/Linux

```bash
# 如果使用 brew 服务
brew services start mongodb-community

# 或手动启动
mongod
```

### 验证连接

启动应用后，查看日志：

```
✅ MongoDB 连接成功
📊 使用 MongoDB 作为数据存储
```

---

## 数据库模型

### Project (项目)

```javascript
{
  id: String,                    // 项目ID (唯一)
  characterInfo: {
    name: String,
    description: String,
    uploadedAt: Date
  },
  characterViews: {
    front: String,
    side: String,
    back: String
  },
  characterThumbnails: {
    front: String,
    side: String,
    back: String
  },
  script: {
    content: String,
    type: String,
    wordCount: Number,
    submittedAt: Date
  },
  storyboard: {
    scenes: Array,
    sceneCount: Number,
    generatedAt: Date
  },
  generatedImages: Array,
  generatedVideos: Array,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 索引

MongoDB 会自动为以下字段创建索引：
- `id` (唯一索引)
- `createdAt` (用于排序)
- `status` (用于查询)

---

## 管理 API

### 获取统计信息

```bash
GET /api/admin/stats
```

响应：
```json
{
  "success": true,
  "stats": {
    "totalProjects": 10,
    "projectsByStatus": {
      "character_uploaded": 2,
      "script_submitted": 3,
      "storyboard_generated": 5
    },
    "totalImages": 50,
    "totalVideos": 10
  },
  "storageMode": "file"
}
```

### 获取健康状态

```bash
GET /api/admin/health
```

### 获取项目详细统计

```bash
GET /api/admin/project-stats
```

### 导出所有项目

```bash
GET /api/admin/export-all
```

### 清理过期数据

```bash
POST /api/admin/cleanup
Content-Type: application/json

{
  "daysOld": 30
}
```

### 批量删除项目

```bash
POST /api/admin/batch-delete
Content-Type: application/json

{
  "projectIds": ["proj_xxx", "proj_yyy"]
}
```

### 获取存储信息

```bash
GET /api/admin/storage-info
```

### 创建备份

```bash
POST /api/admin/backup
```

### 获取备份列表

```bash
GET /api/admin/backups
```

### 恢复备份

```bash
POST /api/admin/restore-backup
Content-Type: application/json

{
  "backupFilename": "projects_backup_2026-03-21T10-00-00-000Z.json"
}
```

---

## 数据迁移

### 从文件存储迁移到 MongoDB

1. 确保 MongoDB 已安装并运行

2. 更新 `.env` 文件：
   ```env
   STORAGE_MODE=mongodb
   MONGODB_URI=mongodb://localhost:27017/storyboard-app
   ```

3. 启动应用，系统会自动迁移数据

4. 验证迁移成功：
   ```bash
   GET /api/admin/stats
   ```

### 从 MongoDB 迁移到文件存储

1. 导出所有项目数据：
   ```bash
   GET /api/admin/export-all
   ```

2. 更新 `.env` 文件：
   ```env
   STORAGE_MODE=file
   ```

3. 将导出的数据保存为 `projects.json`

4. 重启应用

---

## 备份和恢复

### 自动备份 (文件存储)

系统每小时自动备份一次，备份文件位置：
```
./backups/projects_backup_YYYY-MM-DDTHH-MM-SS-SSSZ.json
```

### 手动备份

```bash
POST /api/admin/backup
```

### 查看备份列表

```bash
GET /api/admin/backups
```

### 恢复备份

```bash
POST /api/admin/restore-backup
Content-Type: application/json

{
  "backupFilename": "projects_backup_2026-03-21T10-00-00-000Z.json"
}
```

---

## 性能优化

### 文件存储

- 项目数量 < 1000: 性能良好
- 项目数量 1000-10000: 可接受
- 项目数量 > 10000: 建议迁移到 MongoDB

### MongoDB

- 支持大规模数据存储
- 自动索引优化
- 支持复杂查询
- 支持事务处理

---

## 故障排除

### MongoDB 连接失败

**症状**: 
```
❌ MongoDB 连接失败
⚠️  将使用本地 JSON 文件存储数据
```

**解决方案**:
1. 检查 MongoDB 是否运行
2. 检查连接字符串是否正确
3. 检查防火墙设置
4. 查看 MongoDB 日志

### 数据损坏

**症状**: 
```
加载项目文件失败
```

**解决方案**:
1. 检查 `projects.json` 文件是否有效
2. 从备份恢复：`POST /api/admin/restore-backup`
3. 如果没有备份，可能需要手动修复 JSON 文件

### 磁盘空间不足

**症状**: 
```
保存项目文件失败
```

**解决方案**:
1. 清理过期数据：`POST /api/admin/cleanup`
2. 删除旧备份
3. 扩展磁盘空间

---

## 最佳实践

### 文件存储

1. **定期备份**
   - 启用自动备份
   - 定期检查备份文件

2. **监控文件大小**
   - 定期检查 `projects.json` 大小
   - 当文件过大时考虑迁移到 MongoDB

3. **清理过期数据**
   - 定期清理超过 30 天的项目
   - 使用 `POST /api/admin/cleanup`

### MongoDB

1. **定期备份**
   - 使用 MongoDB 备份工具
   - 定期导出数据

2. **监控性能**
   - 监控查询性能
   - 检查索引使用情况

3. **安全性**
   - 启用身份验证
   - 使用强密码
   - 限制网络访问

---

## 环境变量

```env
# 存储模式: file 或 mongodb
STORAGE_MODE=file

# MongoDB 连接字符串
MONGODB_URI=mongodb://localhost:27017/storyboard-app

# 服务器端口
PORT=3000

# 日志级别
LOG_LEVEL=info

# 文件上传限制
MAX_FILE_SIZE=52428800

# 上传目录
UPLOAD_DIR=./uploads

# 输出目录
OUTPUT_DIR=./outputs
```

---

## 常见问题

### Q: 如何选择存储方式？

**A**: 
- 小规模项目 (< 1000 个): 使用文件存储
- 大规模项目 (> 1000 个): 使用 MongoDB
- 需要高可用性: 使用 MongoDB

### Q: 文件存储和 MongoDB 哪个更快？

**A**: 
- 小数据量: 文件存储更快
- 大数据量: MongoDB 更快
- 复杂查询: MongoDB 更快

### Q: 如何备份 MongoDB 数据？

**A**: 
```bash
# 导出所有数据
mongodump --uri="mongodb://localhost:27017/storyboard-app" --out=./backup

# 恢复数据
mongorestore --uri="mongodb://localhost:27017/storyboard-app" ./backup
```

### Q: 可以同时使用两种存储方式吗？

**A**: 不可以，系统只能使用一种存储方式。如需迁移，请参考"数据迁移"部分。

---

## 支持

如有问题，请：
1. 查看服务器日志
2. 检查 `.env` 配置
3. 验证数据库连接
4. 查看相关文档

---

**最后更新**: 2026-03-21
**版本**: 1.0.0
