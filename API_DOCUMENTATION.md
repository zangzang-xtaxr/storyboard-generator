# 🎬 AI 分镜生成器 - API 文档

## 基础信息

- **基础 URL**: `http://localhost:3000`
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

---

## API 端点

### 1. 上传人物三视图

**端点**: `POST /api/upload-character`

**描述**: 上传人物的正面、侧面和背面视图

**请求**:
```
Content-Type: multipart/form-data

参数:
- frontView (file, optional): 正面视图图片
- sideView (file, optional): 侧面视图图片
- backView (file, optional): 背面视图图片
- characterName (string, optional): 角色名称
- characterDescription (string, optional): 角色描述
```

**响应成功** (200):
```json
{
  "success": true,
  "projectId": "proj_xxx_xxx",
  "characterViews": {
    "front": "/uploads/xxx.jpg",
    "side": "/uploads/xxx.jpg",
    "back": "/uploads/xxx.jpg"
  },
  "characterThumbnails": {
    "front": "/uploads/thumb_xxx.jpg",
    "side": "/uploads/thumb_xxx.jpg",
    "back": "/uploads/thumb_xxx.jpg"
  },
  "message": "人物三视图上传成功"
}
```

**响应失败** (400/500):
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

### 2. 提交剧情脚本

**端点**: `POST /api/submit-script`

**描述**: 提交剧情脚本内容

**请求**:
```json
{
  "projectId": "proj_xxx_xxx",
  "script": "剧情脚本内容...",
  "scriptType": "simple" // simple, detailed, scene_breakdown
}
```

**响应成功** (200):
```json
{
  "success": true,
  "message": "剧情脚本提交成功",
  "script": {
    "content": "脚本内容",
    "type": "simple",
    "wordCount": 1234,
    "submittedAt": "2026-03-21T10:00:00.000Z"
  }
}
```

---

### 3. 生成分镜脚本

**端点**: `POST /api/generate-storyboard`

**描述**: 根据剧情脚本生成分镜脚本

**请求**:
```json
{
  "projectId": "proj_xxx_xxx"
}
```

**响应成功** (200):
```json
{
  "success": true,
  "storyboard": {
    "scenes": [
      {
        "id": "scene-1",
        "sceneNumber": 1,
        "location": "场景位置",
        "description": "场景描述",
        "action": "动作描述",
        "camera": "中景",
        "duration": 3,
        "characters": [],
        "dialogue": "对话内容",
        "notes": "备注"
      }
    ],
    "sceneCount": 5,
    "generatedAt": "2026-03-21T10:00:00.000Z"
  },
  "message": "分镜脚本生成成功，共 5 个镜头"
}
```

---

### 4. 生成分镜图片

**端点**: `POST /api/generate-images`

**描述**: 生成分镜图片

**请求**:
```json
{
  "projectId": "proj_xxx_xxx",
  "sceneIds": ["scene-1", "scene-2"], // 可选，不指定则生成全部
  "style": "anime" // anime, realistic, watercolor, sketch, pixel
}
```

**响应成功** (200):
```json
{
  "success": true,
  "images": [
    {
      "id": "img_xxx",
      "sceneId": "scene-1",
      "sceneNumber": 1,
      "url": "/outputs/placeholder_scene_1_xxx.png",
      "prompt": "图片生成提示词",
      "seed": 123456,
      "style": "anime",
      "generatedAt": "2026-03-21T10:00:00.000Z"
    }
  ],
  "totalGenerated": 5,
  "message": "分镜图生成成功，共 5 张图片"
}
```

---

### 5. 生成单个视频

**端点**: `POST /api/generate-video`

**描述**: 为指定分镜图生成视频

**请求**:
```json
{
  "projectId": "proj_xxx_xxx",
  "sceneId": "scene-1",
  "options": {
    "duration": 3,
    "motionStrength": 0.5,
    "fps": 24
  }
}
```

**响应成功** (200):
```json
{
  "success": true,
  "video": {
    "id": "vid_xxx",
    "sceneId": "scene-1",
    "imageId": "img_xxx",
    "url": "/outputs/video_scene_1_xxx.mp4",
    "duration": 3,
    "fps": 24,
    "resolution": "1024x576",
    "options": { ... },
    "generatedAt": "2026-03-21T10:00:00.000Z"
  },
  "message": "视频生成成功"
}
```

---

### 6. 批量生成所有视频

**端点**: `POST /api/generate-all-videos`

**描述**: 为所有分镜图生成视频

**请求**:
```json
{
  "projectId": "proj_xxx_xxx",
  "options": {
    "duration": 3,
    "motionStrength": 0.5,
    "fps": 24
  }
}
```

**响应成功** (200):
```json
{
  "success": true,
  "videos": [ ... ],
  "totalGenerated": 5,
  "message": "所有视频生成成功，共 5 个视频"
}
```

---

### 7. 获取项目状态

**端点**: `GET /api/project/:projectId`

**描述**: 获取项目的基本信息和统计数据

**响应成功** (200):
```json
{
  "success": true,
  "project": {
    "id": "proj_xxx_xxx",
    "status": "videos_generated",
    "characterInfo": {
      "name": "角色名称",
      "description": "角色描述",
      "uploadedAt": "2026-03-21T10:00:00.000Z"
    },
    "script": {
      "type": "simple",
      "wordCount": 1234,
      "submittedAt": "2026-03-21T10:00:00.000Z"
    },
    "storyboard": {
      "sceneCount": 5,
      "generatedAt": "2026-03-21T10:00:00.000Z"
    },
    "imageCount": 5,
    "videoCount": 5,
    "createdAt": "2026-03-21T10:00:00.000Z",
    "updatedAt": "2026-03-21T10:00:00.000Z"
  }
}
```

---

### 8. 获取项目详细信息

**端点**: `GET /api/project/:projectId/details`

**描述**: 获取项目的完整详细信息

**响应成功** (200):
```json
{
  "success": true,
  "project": {
    "id": "proj_xxx_xxx",
    "status": "videos_generated",
    "characterViews": { ... },
    "characterThumbnails": { ... },
    "characterInfo": { ... },
    "script": { ... },
    "storyboard": { ... },
    "generatedImages": [ ... ],
    "generatedVideos": [ ... ],
    "createdAt": "2026-03-21T10:00:00.000Z",
    "updatedAt": "2026-03-21T10:00:00.000Z"
  }
}
```

---

### 9. 导出项目

**端点**: `GET /api/export/:projectId?format=json`

**描述**: 导出项目数据

**查询参数**:
- `format` (string): 导出格式，目前支持 `json`

**响应成功** (200):
```json
{
  "success": true,
  "export": {
    "projectId": "proj_xxx_xxx",
    "characterInfo": { ... },
    "script": { ... },
    "storyboard": { ... },
    "images": [ ... ],
    "videos": [ ... ],
    "createdAt": "2026-03-21T10:00:00.000Z",
    "updatedAt": "2026-03-21T10:00:00.000Z"
  }
}
```

---

### 10. 获取所有项目

**端点**: `GET /api/projects`

**描述**: 获取所有项目的列表

**响应成功** (200):
```json
{
  "success": true,
  "projects": [
    {
      "id": "proj_xxx_xxx",
      "status": "videos_generated",
      "characterInfo": { ... },
      "sceneCount": 5,
      "imageCount": 5,
      "videoCount": 5,
      "createdAt": "2026-03-21T10:00:00.000Z",
      "updatedAt": "2026-03-21T10:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 11. 删除项目

**端点**: `DELETE /api/project/:projectId`

**描述**: 删除指定项目

**响应成功** (200):
```json
{
  "success": true,
  "message": "项目已删除"
}
```

---

## 项目状态

项目在不同阶段会有不同的状态：

| 状态 | 描述 |
|------|------|
| `character_uploaded` | 已上传人物视图 |
| `script_submitted` | 已提交剧情脚本 |
| `storyboard_generated` | 已生成分镜脚本 |
| `images_generated` | 已生成分镜图片 |
| `videos_generated` | 已生成视频 |

---

## 错误处理

所有错误响应都遵循以下格式：

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

常见错误码：

| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误或业务逻辑错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 文件限制

- **最大文件大小**: 50MB
- **支持的图片格式**: JPG, PNG, WEBP, GIF
- **脚本最大长度**: 50,000 字符
- **脚本最小长度**: 10 字符

---

## 使用示例

### 完整工作流程

```bash
# 1. 上传人物三视图
curl -X POST http://localhost:3000/api/upload-character \
  -F "frontView=@front.jpg" \
  -F "sideView=@side.jpg" \
  -F "backView=@back.jpg" \
  -F "characterName=主角"

# 响应: { "projectId": "proj_xxx_xxx", ... }

# 2. 提交剧情脚本
curl -X POST http://localhost:3000/api/submit-script \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_xxx_xxx",
    "script": "故事内容...",
    "scriptType": "simple"
  }'

# 3. 生成分镜脚本
curl -X POST http://localhost:3000/api/generate-storyboard \
  -H "Content-Type: application/json" \
  -d '{"projectId": "proj_xxx_xxx"}'

# 4. 生成分镜图片
curl -X POST http://localhost:3000/api/generate-images \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_xxx_xxx",
    "style": "anime"
  }'

# 5. 生成视频
curl -X POST http://localhost:3000/api/generate-all-videos \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_xxx_xxx",
    "options": {"duration": 3, "fps": 24}
  }'

# 6. 导出项目
curl http://localhost:3000/api/export/proj_xxx_xxx?format=json
```

---

## 数据持久化

项目数据自动保存到 `projects.json` 文件中。服务器启动时会自动加载已保存的项目。

---

## 注意事项

1. 所有时间戳都使用 ISO 8601 格式
2. 项目 ID 由服务器自动生成，格式为 `proj_xxx_xxx`
3. 文件上传使用 multipart/form-data 格式
4. 所有 API 响应都包含 `success` 字段，用于判断请求是否成功
5. 错误信息在 `error` 字段中返回

---

## 支持

如有问题，请检查：
1. 服务器是否正在运行
2. 项目 ID 是否正确
3. 请求参数是否完整
4. 浏览器控制台和服务器日志中的错误信息
