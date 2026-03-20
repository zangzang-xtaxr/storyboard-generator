// ============ 数据库管理 API 路由 ============

module.exports = function(app, storageManager) {
  
  // 获取数据库统计信息
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const result = await storageManager.getProjectStats();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        stats: result.stats,
        storageMode: storageManager.useDatabase ? 'mongodb' : 'file'
      });
    } catch (error) {
      console.error('获取统计信息失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取数据库健康状态
  app.get('/api/admin/health', async (req, res) => {
    try {
      const result = await storageManager.getAllProjects();
      
      res.json({
        success: true,
        health: {
          status: 'healthy',
          storageMode: storageManager.useDatabase ? 'mongodb' : 'file',
          projectCount: result.projects?.length || 0,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        health: {
          status: 'unhealthy',
          error: error.message
        }
      });
    }
  });

  // 导出所有项目数据
  app.get('/api/admin/export-all', async (req, res) => {
    try {
      const result = await storageManager.getAllProjects();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.json({
        success: true,
        exportedAt: new Date().toISOString(),
        projectCount: result.projects.length,
        projects: result.projects
      });
    } catch (error) {
      console.error('导出数据失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 清理过期数据
  app.post('/api/admin/cleanup', async (req, res) => {
    try {
      const { daysOld = 30 } = req.body;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await storageManager.getAllProjects();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      let deletedCount = 0;
      for (const project of result.projects) {
        const createdAt = new Date(project.createdAt);
        if (createdAt < cutoffDate) {
          await storageManager.deleteProject(project.id);
          deletedCount++;
        }
      }

      res.json({
        success: true,
        message: `已清理 ${deletedCount} 个超过 ${daysOld} 天的项目`,
        deletedCount
      });
    } catch (error) {
      console.error('清理数据失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取项目详细统计
  app.get('/api/admin/project-stats', async (req, res) => {
    try {
      const result = await storageManager.getAllProjects();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      const stats = {
        totalProjects: result.projects.length,
        byStatus: {},
        byDate: {},
        averageScenes: 0,
        averageImages: 0,
        averageVideos: 0,
        totalScenes: 0,
        totalImages: 0,
        totalVideos: 0
      };

      result.projects.forEach(p => {
        // 按状态统计
        stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;

        // 按日期统计
        const date = new Date(p.createdAt).toISOString().split('T')[0];
        stats.byDate[date] = (stats.byDate[date] || 0) + 1;

        // 统计场景、图片、视频
        const sceneCount = p.storyboard?.sceneCount || 0;
        const imageCount = p.generatedImages?.length || 0;
        const videoCount = p.generatedVideos?.length || 0;

        stats.totalScenes += sceneCount;
        stats.totalImages += imageCount;
        stats.totalVideos += videoCount;
      });

      // 计算平均值
      if (result.projects.length > 0) {
        stats.averageScenes = (stats.totalScenes / result.projects.length).toFixed(2);
        stats.averageImages = (stats.totalImages / result.projects.length).toFixed(2);
        stats.averageVideos = (stats.totalVideos / result.projects.length).toFixed(2);
      }

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('获取项目统计失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 批量删除项目
  app.post('/api/admin/batch-delete', async (req, res) => {
    try {
      const { projectIds } = req.body;

      if (!Array.isArray(projectIds) || projectIds.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: '请提供有效的项目ID列表' 
        });
      }

      let deletedCount = 0;
      let errorCount = 0;

      for (const projectId of projectIds) {
        const result = await storageManager.deleteProject(projectId);
        if (result.success) {
          deletedCount++;
        } else {
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `已删除 ${deletedCount} 个项目，失败 ${errorCount} 个`,
        deletedCount,
        errorCount
      });
    } catch (error) {
      console.error('批量删除失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取存储信息
  app.get('/api/admin/storage-info', async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const { config } = require('./db-config');

      let storageInfo = {
        mode: storageManager.useDatabase ? 'mongodb' : 'file',
        timestamp: new Date().toISOString()
      };

      if (!storageManager.useDatabase) {
        // 文件存储信息
        const projectsFile = config.fileStorage.projectsFile;
        if (fs.existsSync(projectsFile)) {
          const stats = fs.statSync(projectsFile);
          storageInfo.fileSize = stats.size;
          storageInfo.filePath = projectsFile;
          storageInfo.lastModified = stats.mtime;
        }

        // 备份信息
        if (fs.existsSync(config.fileStorage.backupDir)) {
          const backups = fs.readdirSync(config.fileStorage.backupDir)
            .filter(f => f.startsWith('projects_backup_'));
          storageInfo.backupCount = backups.length;
          storageInfo.backupDir = config.fileStorage.backupDir;
        }
      } else {
        // MongoDB 信息
        storageInfo.database = config.mongodb.uri;
      }

      res.json({
        success: true,
        storageInfo
      });
    } catch (error) {
      console.error('获取存储信息失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 数据库备份
  app.post('/api/admin/backup', async (req, res) => {
    try {
      if (storageManager.useDatabase) {
        return res.status(400).json({
          success: false,
          error: '使用 MongoDB 时无需手动备份'
        });
      }

      const fs = require('fs');
      const path = require('path');
      const { config } = require('./db-config');

      // 确保备份目录存在
      if (!fs.existsSync(config.fileStorage.backupDir)) {
        fs.mkdirSync(config.fileStorage.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        config.fileStorage.backupDir,
        `projects_backup_${timestamp}.json`
      );

      const projectsFile = config.fileStorage.projectsFile;
      if (fs.existsSync(projectsFile)) {
        fs.copyFileSync(projectsFile, backupFile);
        
        res.json({
          success: true,
          message: '备份成功',
          backupFile,
          timestamp
        });
      } else {
        res.status(404).json({
          success: false,
          error: '项目文件不存在'
        });
      }
    } catch (error) {
      console.error('备份失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取备份列表
  app.get('/api/admin/backups', async (req, res) => {
    try {
      if (storageManager.useDatabase) {
        return res.json({
          success: true,
          backups: [],
          message: '使用 MongoDB 时无需备份'
        });
      }

      const fs = require('fs');
      const path = require('path');
      const { config } = require('./db-config');

      if (!fs.existsSync(config.fileStorage.backupDir)) {
        return res.json({
          success: true,
          backups: []
        });
      }

      const backups = fs.readdirSync(config.fileStorage.backupDir)
        .filter(f => f.startsWith('projects_backup_'))
        .map(f => {
          const filePath = path.join(config.fileStorage.backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            filename: f,
            size: stats.size,
            created: stats.mtime
          };
        })
        .sort((a, b) => b.created - a.created);

      res.json({
        success: true,
        backups,
        backupCount: backups.length
      });
    } catch (error) {
      console.error('获取备份列表失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 恢复备份
  app.post('/api/admin/restore-backup', async (req, res) => {
    try {
      if (storageManager.useDatabase) {
        return res.status(400).json({
          success: false,
          error: '使用 MongoDB 时无法恢复备份'
        });
      }

      const { backupFilename } = req.body;
      if (!backupFilename) {
        return res.status(400).json({
          success: false,
          error: '请指定备份文件名'
        });
      }

      const fs = require('fs');
      const path = require('path');
      const { config } = require('./db-config');

      const backupFile = path.join(config.fileStorage.backupDir, backupFilename);
      const projectsFile = config.fileStorage.projectsFile;

      if (!fs.existsSync(backupFile)) {
        return res.status(404).json({
          success: false,
          error: '备份文件不存在'
        });
      }

      // 备份当前文件
      if (fs.existsSync(projectsFile)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        fs.copyFileSync(projectsFile, `${projectsFile}.pre-restore-${timestamp}`);
      }

      // 恢复备份
      fs.copyFileSync(backupFile, projectsFile);

      // 重新加载项目
      storageManager.loadFromFile();

      res.json({
        success: true,
        message: '备份已恢复',
        restoredFrom: backupFilename
      });
    } catch (error) {
      console.error('恢复备份失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
};
