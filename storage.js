const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ============ 存储策略 ============

class StorageManager {
  constructor(useDatabase = false) {
    this.useDatabase = useDatabase;
    this.projectsFile = path.join(__dirname, 'projects.json');
    this.projects = new Map();
    
    if (!useDatabase) {
      this.loadFromFile();
    }
  }

  // ========== 文件存储方法 ==========

  loadFromFile() {
    try {
      if (fs.existsSync(this.projectsFile)) {
        const data = fs.readFileSync(this.projectsFile, 'utf-8');
        const projectsData = JSON.parse(data);
        projectsData.forEach(p => {
          this.projects.set(p.id, p);
        });
        console.log(`✅ 已从文件加载 ${projectsData.length} 个项目`);
      }
    } catch (error) {
      console.error('加载项目文件失败:', error.message);
    }
  }

  saveToFile() {
    try {
      const projectsData = Array.from(this.projects.values());
      fs.writeFileSync(this.projectsFile, JSON.stringify(projectsData, null, 2));
    } catch (error) {
      console.error('保存项目文件失败:', error.message);
    }
  }

  // ========== 通用存储方法 ==========

  async createProject(projectData) {
    try {
      if (this.useDatabase) {
        const { createProject } = require('./database');
        return await createProject(projectData);
      } else {
        this.projects.set(projectData.id, projectData);
        this.saveToFile();
        return { success: true, project: projectData };
      }
    } catch (error) {
      console.error('创建项目失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getProject(projectId) {
    try {
      if (this.useDatabase) {
        const { getProject } = require('./database');
        return await getProject(projectId);
      } else {
        const project = this.projects.get(projectId);
        if (!project) {
          return { success: false, error: '项目不存在' };
        }
        return { success: true, project };
      }
    } catch (error) {
      console.error('获取项目失败:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProject(projectId, updateData) {
    try {
      if (this.useDatabase) {
        const { updateProject } = require('./database');
        return await updateProject(projectId, updateData);
      } else {
        const project = this.projects.get(projectId);
        if (!project) {
          return { success: false, error: '项目不存在' };
        }
        const updated = { ...project, ...updateData, updatedAt: new Date().toISOString() };
        this.projects.set(projectId, updated);
        this.saveToFile();
        return { success: true, project: updated };
      }
    } catch (error) {
      console.error('更新项目失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteProject(projectId) {
    try {
      if (this.useDatabase) {
        const { deleteProject } = require('./database');
        return await deleteProject(projectId);
      } else {
        if (!this.projects.has(projectId)) {
          return { success: false, error: '项目不存在' };
        }
        this.projects.delete(projectId);
        this.saveToFile();
        return { success: true, message: '项目已删除' };
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllProjects() {
    try {
      if (this.useDatabase) {
        const { getAllProjects } = require('./database');
        return await getAllProjects();
      } else {
        const projects = Array.from(this.projects.values()).sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        return { success: true, projects };
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
      return { success: false, error: error.message };
    }
  }

  async addGeneratedImage(projectId, imageData) {
    try {
      if (this.useDatabase) {
        const { addGeneratedImage } = require('./database');
        return await addGeneratedImage(projectId, imageData);
      } else {
        const project = this.projects.get(projectId);
        if (!project) {
          return { success: false, error: '项目不存在' };
        }
        project.generatedImages.push(imageData);
        project.updatedAt = new Date().toISOString();
        this.saveToFile();
        return { success: true, image: imageData };
      }
    } catch (error) {
      console.error('添加图片失败:', error);
      return { success: false, error: error.message };
    }
  }

  async addGeneratedVideo(projectId, videoData) {
    try {
      if (this.useDatabase) {
        const { addGeneratedVideo } = require('./database');
        return await addGeneratedVideo(projectId, videoData);
      } else {
        const project = this.projects.get(projectId);
        if (!project) {
          return { success: false, error: '项目不存在' };
        }
        project.generatedVideos.push(videoData);
        project.updatedAt = new Date().toISOString();
        this.saveToFile();
        return { success: true, video: videoData };
      }
    } catch (error) {
      console.error('添加视频失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getProjectStats() {
    try {
      if (this.useDatabase) {
        const { getProjectStats } = require('./database');
        return await getProjectStats();
      } else {
        const projects = Array.from(this.projects.values());
        const stats = {
          totalProjects: projects.length,
          projectsByStatus: {},
          totalImages: 0,
          totalVideos: 0
        };

        projects.forEach(p => {
          // 按状态统计
          stats.projectsByStatus[p.status] = (stats.projectsByStatus[p.status] || 0) + 1;
          // 统计图片和视频
          stats.totalImages += p.generatedImages?.length || 0;
          stats.totalVideos += p.generatedVideos?.length || 0;
        });

        return { success: true, stats };
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
      return { success: false, error: error.message };
    }
  }

  // ========== 辅助方法 ==========

  projectExists(projectId) {
    if (this.useDatabase) {
      // 数据库模式下需要异步检查
      return true; // 由调用者处理
    } else {
      return this.projects.has(projectId);
    }
  }

  getProjectCount() {
    if (this.useDatabase) {
      return -1; // 需要异步获取
    } else {
      return this.projects.size;
    }
  }

  clear() {
    if (!this.useDatabase) {
      this.projects.clear();
      this.saveToFile();
    }
  }
}

module.exports = StorageManager;
