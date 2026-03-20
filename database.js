const mongoose = require('mongoose');

// ============ 数据库连接 ============

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/storyboard-app';

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ MongoDB 连接成功');
    return true;
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    console.log('⚠️  将使用本地 JSON 文件存储数据');
    return false;
  }
}

// ============ 数据库模型 ============

// 人物模型
const characterSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  name: String,
  description: String,
  views: {
    front: String,
    side: String,
    back: String
  },
  thumbnails: {
    front: String,
    side: String,
    back: String
  },
  uploadedAt: { type: Date, default: Date.now }
});

// 脚本模型
const scriptSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['simple', 'detailed', 'scene_breakdown'], default: 'simple' },
  wordCount: Number,
  submittedAt: { type: Date, default: Date.now }
});

// 分镜模型
const storyboardSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  scenes: [{
    id: String,
    sceneNumber: Number,
    location: String,
    description: String,
    action: String,
    camera: String,
    duration: Number,
    characters: [String],
    dialogue: String,
    notes: String
  }],
  sceneCount: Number,
  generatedAt: { type: Date, default: Date.now }
});

// 生成的图片模型
const generatedImageSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  id: String,
  sceneId: String,
  sceneNumber: Number,
  url: String,
  prompt: String,
  seed: Number,
  style: String,
  generatedAt: { type: Date, default: Date.now }
});

// 生成的视频模型
const generatedVideoSchema = new mongoose.Schema({
  projectId: { type: String, required: true },
  id: String,
  sceneId: String,
  imageId: String,
  url: String,
  duration: Number,
  fps: Number,
  resolution: String,
  options: mongoose.Schema.Types.Mixed,
  generatedAt: { type: Date, default: Date.now }
});

// 项目模型
const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
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
    scenes: [mongoose.Schema.Types.Mixed],
    sceneCount: Number,
    generatedAt: Date
  },
  generatedImages: [mongoose.Schema.Types.Mixed],
  generatedVideos: [mongoose.Schema.Types.Mixed],
  status: {
    type: String,
    enum: ['character_uploaded', 'script_submitted', 'storyboard_generated', 'images_generated', 'videos_generated'],
    default: 'character_uploaded'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 创建模型
const Character = mongoose.model('Character', characterSchema);
const Script = mongoose.model('Script', scriptSchema);
const Storyboard = mongoose.model('Storyboard', storyboardSchema);
const GeneratedImage = mongoose.model('GeneratedImage', generatedImageSchema);
const GeneratedVideo = mongoose.model('GeneratedVideo', generatedVideoSchema);
const Project = mongoose.model('Project', projectSchema);

// ============ 数据库操作函数 ============

// 创建项目
async function createProject(projectData) {
  try {
    const project = new Project(projectData);
    await project.save();
    return { success: true, project };
  } catch (error) {
    console.error('创建项目失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取项目
async function getProject(projectId) {
  try {
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return { success: false, error: '项目不存在' };
    }
    return { success: true, project };
  } catch (error) {
    console.error('获取项目失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新项目
async function updateProject(projectId, updateData) {
  try {
    const project = await Project.findOneAndUpdate(
      { id: projectId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    if (!project) {
      return { success: false, error: '项目不存在' };
    }
    return { success: true, project };
  } catch (error) {
    console.error('更新项目失败:', error);
    return { success: false, error: error.message };
  }
}

// 删除项目
async function deleteProject(projectId) {
  try {
    const result = await Project.deleteOne({ id: projectId });
    if (result.deletedCount === 0) {
      return { success: false, error: '项目不存在' };
    }
    return { success: true, message: '项目已删除' };
  } catch (error) {
    console.error('删除项目失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取所有项目
async function getAllProjects() {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    return { success: true, projects };
  } catch (error) {
    console.error('获取项目列表失败:', error);
    return { success: false, error: error.message };
  }
}

// 添加生成的图片
async function addGeneratedImage(projectId, imageData) {
  try {
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return { success: false, error: '项目不存在' };
    }
    
    project.generatedImages.push(imageData);
    await project.save();
    
    return { success: true, image: imageData };
  } catch (error) {
    console.error('添加图片失败:', error);
    return { success: false, error: error.message };
  }
}

// 添加生成的视频
async function addGeneratedVideo(projectId, videoData) {
  try {
    const project = await Project.findOne({ id: projectId });
    if (!project) {
      return { success: false, error: '项目不存在' };
    }
    
    project.generatedVideos.push(videoData);
    await project.save();
    
    return { success: true, video: videoData };
  } catch (error) {
    console.error('添加视频失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取项目统计信息
async function getProjectStats() {
  try {
    const totalProjects = await Project.countDocuments();
    const projectsByStatus = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalImages = await Project.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $size: '$generatedImages' } }
        }
      }
    ]);
    
    const totalVideos = await Project.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: { $size: '$generatedVideos' } }
        }
      }
    ]);
    
    return {
      success: true,
      stats: {
        totalProjects,
        projectsByStatus,
        totalImages: totalImages[0]?.total || 0,
        totalVideos: totalVideos[0]?.total || 0
      }
    };
  } catch (error) {
    console.error('获取统计信息失败:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  connectDatabase,
  Project,
  Character,
  Script,
  Storyboard,
  GeneratedImage,
  GeneratedVideo,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getAllProjects,
  addGeneratedImage,
  addGeneratedVideo,
  getProjectStats
};
