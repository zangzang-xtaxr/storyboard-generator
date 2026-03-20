const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const helmet = require('helmet');
const compression = require('compression');

require('dotenv').config();

// Claude API 集成
const { generateStoryboardWithClaude, checkClaudeAvailability } = require('./claude');

const app = express();
const PORT = process.env.PORT || 3000;

// 认证模块
const { router: authRouter } = require('./auth');
const { requireAuth } = require('./auth-middleware');

// ============ 安全中间件 ============

// 使用 helmet 增强安全性
app.use(helmet());

// 使用 compression 压缩响应
app.use(compression());

// 速率限制
try {
  const { generalLimiter, uploadLimiter, apiLimiter, generateLimiter } = require('./rate-limit');
  app.use(generalLimiter);
  app.use(uploadLimiter);
  app.use(apiLimiter);
  app.use(generateLimiter);
  console.log('✅ 速率限制已启用');
} catch (error) {
  console.warn('⚠️  速率限制模块加载失败，继续运行:', error.message);
}

// 确保上传目录存在
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'outputs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB 限制
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 JPG, PNG, WEBP, GIF 格式'));
    }
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static(uploadDir));
app.use('/outputs', express.static(outputDir));

// ============ 认证路由（公开）============
app.use('/api/auth', authRouter);

// ============ 数据库/存储初始化 ============
// storageManager 在服务器启动前通过 initializeStorage() 初始化
// 支持 MongoDB（STORAGE_MODE=mongodb）或本地 JSON 文件（默认）
let storageManager = null;

// ============ 数据验证函数 ============

function validateScript(script) {
  if (!script || typeof script !== 'string') {
    return { valid: false, error: '脚本内容不能为空' };
  }
  if (script.trim().length < 10) {
    return { valid: false, error: '脚本内容过短（至少10个字符）' };
  }
  if (script.length > 50000) {
    return { valid: false, error: '脚本内容过长（最多50000个字符）' };
  }
  return { valid: true };
}

// ============ API 路由 ============

// ============ 受保护的 API 路由（需要登录）============

// 上传人物三视图
app.post('/api/upload-character', requireAuth, upload.fields([
  { name: 'frontView', maxCount: 1 },
  { name: 'sideView', maxCount: 1 },
  { name: 'backView', maxCount: 1 }
]), async (req, res) => {
  try {
    // 验证至少上传了一个文件
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ success: false, error: '请至少上传一个人物视图' });
    }

    const projectId = uuidv4();
    const characterViews = {};
    const characterThumbnails = {};

    // 处理每个上传的文件
    const viewTypes = ['frontView', 'sideView', 'backView'];
    const viewNames = { frontView: 'front', sideView: 'side', backView: 'back' };

    for (const viewType of viewTypes) {
      if (req.files[viewType]) {
        const file = req.files[viewType][0];
        const viewName = viewNames[viewType];
        const filePath = `/uploads/${file.filename}`;
        const thumbnailPath = `/uploads/thumb_${file.filename}`;

        characterViews[viewName] = filePath;

        // 创建缩略图
        try {
          const fullPath = path.join(uploadDir, file.filename);
          const thumbnailFullPath = path.join(uploadDir, `thumb_${file.filename}`);
          
          await sharp(fullPath)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .toFile(thumbnailFullPath);
          
          characterThumbnails[viewName] = thumbnailPath;
        } catch (thumbError) {
          console.error(`缩略图生成失败 (${viewName}):`, thumbError);
          characterThumbnails[viewName] = filePath; // 使用原图作为备用
        }
      }
    }

    // 创建项目
    const project = {
      id: projectId,
      characterViews,
      characterThumbnails,
      characterInfo: {
        name: req.body.characterName || '未命名角色',
        description: req.body.characterDescription || '',
        uploadedAt: new Date().toISOString()
      },
      script: null,
      storyboard: null,
      generatedImages: [],
      generatedVideos: [],
      status: 'character_uploaded',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const createResult = await storageManager.createProject(project);
    if (!createResult.success) {
      return res.status(500).json({ success: false, error: createResult.error });
    }

    res.json({
      success: true,
      projectId,
      characterViews,
      characterThumbnails,
      message: '人物三视图上传成功'
    });
  } catch (error) {
    console.error('上传错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 提交剧情脚本
app.post('/api/submit-script', requireAuth, async (req, res) => {
  try {
    const { projectId, script, scriptType } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: '无效的项目ID' });
    }

    // 验证脚本内容
    const scriptValidation = validateScript(script);
    if (!scriptValidation.valid) {
      return res.status(400).json({ success: false, error: scriptValidation.error });
    }

    const getResult = await storageManager.getProject(projectId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: getResult.error });
    }

    const project = getResult.project;

    // 验证项目状态
    if (project.status !== 'character_uploaded') {
      return res.status(400).json({
        success: false,
        error: '项目状态不正确，请先上传人物视图'
      });
    }

    const scriptData = {
      content: script,
      type: scriptType || 'simple',
      wordCount: script.length,
      submittedAt: new Date().toISOString()
    };

    const updateResult = await storageManager.updateProject(projectId, {
      script: scriptData,
      status: 'script_submitted'
    });

    if (!updateResult.success) {
      return res.status(500).json({ success: false, error: updateResult.error });
    }

    res.json({
      success: true,
      message: '剧情脚本提交成功',
      script: scriptData
    });
  } catch (error) {
    console.error('提交脚本错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成分镜脚本
app.post('/api/generate-storyboard', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: '无效的项目ID' });
    }

    const getResult = await storageManager.getProject(projectId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: getResult.error });
    }

    const project = getResult.project;

    if (!project.script) {
      return res.status(400).json({ success: false, error: '请先提交剧情脚本' });
    }

    // 生成分镜脚本
    const storyboardScript = await generateStoryboardScript(project.script.content);

    const storyboardData = {
      scenes: storyboardScript,
      sceneCount: storyboardScript.length,
      generatedAt: new Date().toISOString()
    };

    const updateResult = await storageManager.updateProject(projectId, {
      storyboard: storyboardData,
      status: 'storyboard_generated'
    });

    if (!updateResult.success) {
      return res.status(500).json({ success: false, error: updateResult.error });
    }

    res.json({
      success: true,
      storyboard: storyboardData,
      message: `分镜脚本生成成功，共 ${storyboardScript.length} 个镜头`
    });
  } catch (error) {
    console.error('生成分镜脚本错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成保持人物一致性的分镜图
app.post('/api/generate-images', requireAuth, async (req, res) => {
  try {
    const { projectId, sceneIds, style } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: '无效的项目ID' });
    }

    const getResult = await storageManager.getProject(projectId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: getResult.error });
    }

    const project = getResult.project;

    if (!project.storyboard || !project.storyboard.scenes) {
      return res.status(400).json({ success: false, error: '请先生成分镜脚本' });
    }

    const scenesToGenerate = sceneIds
      ? project.storyboard.scenes.filter(s => sceneIds.includes(s.id))
      : project.storyboard.scenes;

    if (scenesToGenerate.length === 0) {
      return res.status(400).json({ success: false, error: '没有可生成的镜头' });
    }

    const generatedImages = [];

    for (const scene of scenesToGenerate) {
      // 检查是否已生成过
      const existingImage = (project.generatedImages || []).find(img => img.sceneId === scene.id);
      if (existingImage) {
        generatedImages.push(existingImage);
        continue;
      }

      // 生成新图片
      const imageResult = await generateSceneImage(scene, project.characterViews, style);

      const imageData = {
        id: uuidv4(),
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        url: imageResult.url,
        prompt: imageResult.prompt,
        seed: imageResult.seed,
        style: style,
        generatedAt: new Date().toISOString()
      };

      generatedImages.push(imageData);
      await storageManager.addGeneratedImage(projectId, imageData);
    }

    await storageManager.updateProject(projectId, { status: 'images_generated' });

    const refreshed = await storageManager.getProject(projectId);
    const totalImages = refreshed.success ? (refreshed.project.generatedImages || []).length : generatedImages.length;

    res.json({
      success: true,
      images: generatedImages,
      totalGenerated: totalImages,
      message: `分镜图生成成功，共 ${generatedImages.length} 张图片`
    });
  } catch (error) {
    console.error('生成图片错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成视频
app.post('/api/generate-video', requireAuth, async (req, res) => {
  try {
    const { projectId, sceneId, options } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: '无效的项目ID' });
    }

    const getResult = await storageManager.getProject(projectId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: getResult.error });
    }

    const project = getResult.project;
    const image = (project.generatedImages || []).find(img => img.sceneId === sceneId);

    if (!image) {
      return res.status(404).json({ success: false, error: '分镜图不存在' });
    }

    // 检查是否已生成过
    const existingVideo = (project.generatedVideos || []).find(v => v.imageId === image.id);
    if (existingVideo) {
      return res.json({
        success: true,
        video: existingVideo,
        message: '视频已存在'
      });
    }

    // 生成新视频
    const videoResult = await generateVideoFromImage(image, options);

    const videoData = {
      id: uuidv4(),
      sceneId,
      imageId: image.id,
      url: videoResult.url,
      duration: videoResult.duration,
      fps: videoResult.fps,
      resolution: videoResult.resolution,
      options,
      generatedAt: new Date().toISOString()
    };

    await storageManager.addGeneratedVideo(projectId, videoData);
    await storageManager.updateProject(projectId, { status: 'videos_generated' });

    res.json({
      success: true,
      video: videoData,
      message: '视频生成成功'
    });
  } catch (error) {
    console.error('生成视频错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量生成所有视频
app.post('/api/generate-all-videos', requireAuth, async (req, res) => {
  try {
    const { projectId, options } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ success: false, error: '无效的项目ID' });
    }

    const getResult = await storageManager.getProject(projectId);
    if (!getResult.success) {
      return res.status(404).json({ success: false, error: getResult.error });
    }

    const project = getResult.project;

    if (!project.generatedImages || project.generatedImages.length === 0) {
      return res.status(400).json({ success: false, error: '没有可生成视频的图片' });
    }

    const videos = [];

    for (const image of project.generatedImages) {
      // 检查是否已生成过
      const existingVideo = (project.generatedVideos || []).find(v => v.imageId === image.id);
      if (existingVideo) {
        videos.push(existingVideo);
        continue;
      }

      // 生成新视频
      const videoResult = await generateVideoFromImage(image, options);

      const videoData = {
        id: uuidv4(),
        sceneId: image.sceneId,
        imageId: image.id,
        url: videoResult.url,
        duration: videoResult.duration,
        fps: videoResult.fps,
        resolution: videoResult.resolution,
        options,
        generatedAt: new Date().toISOString()
      };

      await storageManager.addGeneratedVideo(projectId, videoData);
      videos.push(videoData);
    }

    await storageManager.updateProject(projectId, { status: 'videos_generated' });

    const refreshed = await storageManager.getProject(projectId);
    const totalVideos = refreshed.success ? (refreshed.project.generatedVideos || []).length : videos.length;

    res.json({
      success: true,
      videos,
      totalGenerated: totalVideos,
      message: `所有视频生成成功，共 ${videos.length} 个视频`
    });
  } catch (error) {
    console.error('批量生成视频错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取项目状态
app.get('/api/project/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await storageManager.getProject(projectId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    const p = result.project;
    res.json({
      success: true,
      project: {
        id: p.id,
        status: p.status,
        characterInfo: p.characterInfo,
        script: p.script ? {
          type: p.script.type,
          wordCount: p.script.wordCount,
          submittedAt: p.script.submittedAt
        } : null,
        storyboard: p.storyboard ? {
          sceneCount: p.storyboard.sceneCount,
          generatedAt: p.storyboard.generatedAt
        } : null,
        imageCount: (p.generatedImages || []).length,
        videoCount: (p.generatedVideos || []).length,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取项目详细信息
app.get('/api/project/:projectId/details', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await storageManager.getProject(projectId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({ success: true, project: result.project });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 导出项目
app.get('/api/export/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format } = req.query;
    const result = await storageManager.getProject(projectId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    const p = result.project;
    if (format === 'json') {
      res.json({
        success: true,
        export: {
          projectId: p.id,
          characterInfo: p.characterInfo,
          script: p.script,
          storyboard: p.storyboard,
          images: p.generatedImages,
          videos: p.generatedVideos,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        }
      });
    } else {
      res.json({ success: true, message: '支持的导出格式: json' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取所有项目
app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const result = await storageManager.getAllProjects();
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    const projectList = result.projects.map(p => ({
      id: p.id,
      status: p.status,
      characterInfo: p.characterInfo,
      sceneCount: p.storyboard?.sceneCount || 0,
      imageCount: (p.generatedImages || []).length,
      videoCount: (p.generatedVideos || []).length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    res.json({
      success: true,
      projects: projectList,
      total: projectList.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除项目
app.delete('/api/project/:projectId', requireAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await storageManager.deleteProject(projectId);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({ success: true, message: '项目已删除' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============ AI 函数 ============

/**
 * 生成分镜脚本
 * 优先使用 Claude API；若 API Key 未配置则回退到本地规则解析
 */
async function generateStoryboardScript(scriptContent) {
  const claudeStatus = checkClaudeAvailability();

  if (claudeStatus.available) {
    try {
      console.log('🤖 使用 Claude API 生成分镜脚本...');
      const scenes = await generateStoryboardWithClaude(scriptContent);
      console.log(`✅ Claude 生成了 ${scenes.length} 个分镜场景`);
      return scenes;
    } catch (error) {
      console.error('❌ Claude API 调用失败，回退到本地解析:', error.message);
    }
  } else {
    console.log(`⚠️  ${claudeStatus.reason}`);
  }

  // 本地规则解析（回退方案）
  return parseScriptLocally(scriptContent);
}

/**
 * 本地规则解析分镜脚本（Claude API 不可用时的回退方案）
 */
function parseScriptLocally(scriptContent) {
  const scenes = [];
  const lines = scriptContent.split(/\n/).filter(l => l.trim());
  let sceneNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.match(/^(场景|Scene|SCENE)[\s:：]/i) || line.match(/^(内景|外景|INT\.|EXT\.)/i)) {
      scenes.push({
        id: `scene-${sceneNumber}`,
        sceneNumber: sceneNumber++,
        location: line,
        description: lines[i + 1] || '',
        action: '',
        camera: '中景',
        duration: 3,
        characters: [],
        dialogue: '',
        notes: ''
      });
    } else if (line.startsWith('【') && line.endsWith('】')) {
      if (scenes.length > 0) {
        scenes[scenes.length - 1].action = line.replace(/[【】]/g, '');
      }
    } else if (line.includes('：') || line.includes(':')) {
      if (scenes.length > 0) {
        scenes[scenes.length - 1].dialogue += line + '\n';
      }
    }
  }

  if (scenes.length === 0) {
    const paragraphs = scriptContent.split(/\n\n+/);
    paragraphs.forEach((para, idx) => {
      if (para.trim()) {
        scenes.push({
          id: `scene-${idx + 1}`,
          sceneNumber: idx + 1,
          location: `场景 ${idx + 1}`,
          description: para.trim(),
          action: '',
          camera: ['全景', '中景', '特写', '近景'][idx % 4],
          duration: 3 + (idx % 3),
          characters: [],
          dialogue: '',
          notes: ''
        });
      }
    });
  }

  return scenes;
}

async function generateSceneImage(scene, characterViews, style = 'anime') {
  // 模拟图片生成
  // 实际应调用: Stable Diffusion / DALL-E 3 / Midjourney API

  const stylePrompts = {
    anime: 'anime style, high quality, detailed',
    realistic: 'photorealistic, cinematic lighting, 8k',
    watercolor: 'watercolor painting style, artistic',
    sketch: 'pencil sketch style, monochrome',
    pixel: 'pixel art style, retro game aesthetic'
  };

  const prompt = `${scene.description}. ${scene.action}.
    Character reference from front view: ${characterViews.front || 'N/A'}.
    Style: ${stylePrompts[style] || stylePrompts.anime}.
    Camera angle: ${scene.camera}.
    Maintain character consistency across all shots.`;

  // 模拟生成延迟
  await delay(2000);

  // 返回模拟结果
  const seed = Math.floor(Math.random() * 1000000);
  return {
    url: `/outputs/placeholder_scene_${scene.sceneNumber}_${seed}.png`,
    prompt: prompt,
    seed: seed
  };
}

async function generateVideoFromImage(image, options = {}) {
  // 模拟视频生成
  // 实际应调用: RunwayML Gen-2 / Pika Labs / Stable Video Diffusion / Sora API

  const duration = options.duration || 3;
  const motionStrength = options.motionStrength || 0.5;

  // 模拟生成延迟
  await delay(3000);

  const seed = Math.floor(Math.random() * 1000000);
  return {
    url: `/outputs/video_scene_${image.sceneNumber}_${seed}.mp4`,
    duration: duration,
    fps: 24,
    resolution: '1024x576'
  };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 错误处理中间件
// ============ Health Check (no auth required) ============
app.get('/api/health', (req, res) => {
  const info = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    storage: storageManager
      ? (storageManager.useDatabase ? 'mongodb' : 'file')
      : 'initializing',
    version: '1.0.0',
  };
  res.json(info);
});

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: '文件大小超过限制（最大50MB）' });
    }
  }
  console.error(error);
  res.status(500).json({ success: false, error: error.message });
});

// 启动服务器
async function startServer() {
  // 初始化存储（MongoDB 或文件）
  const { initializeStorage, setupAutoBackup, migrateToDatabase } = require('./db-config');
  storageManager = await initializeStorage();
  setupAutoBackup(storageManager);

  // 注册管理 API 路由（需要在 storageManager 初始化后挂载）
  require('./admin-routes')(app, storageManager);
  console.log('✅ 管理 API 路由已注册');

  // 数据迁移端点（仅在 MongoDB 模式下有效）
  app.post('/api/admin/migrate', async (req, res) => {
    try {
      await migrateToDatabase(storageManager);
      res.json({ success: true, message: '数据迁移完成' });
    } catch (error) {
      console.error('数据迁移失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║         🎬 AI 分镜生成服务器已启动                        ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    console.log(`📍 服务器地址: http://localhost:${PORT}`);
    console.log(`📍 备用地址:   http://127.0.0.1:${PORT}`);
    console.log(`📁 上传目录:   ${uploadDir}`);
    console.log(`📁 输出目录:   ${outputDir}`);
    console.log(`💾 存储模式:   ${storageManager.useDatabase ? 'MongoDB' : '本地文件'}`);
    console.log(`\n💡 在浏览器中打开上述地址即可使用应用\n`);
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n\n👋 正在关闭服务器...');
    server.close(() => {
      console.log('✅ 服务器已关闭\n');
      process.exit(0);
    });
  });

  return server;
}

startServer().catch(err => {
  console.error('服务器启动失败:', err);
  process.exit(1);
});

module.exports = app;
