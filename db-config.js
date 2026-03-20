// ============ 数据库配置 ============

const config = {
  // 存储模式: 'file' 或 'mongodb'
  storageMode: process.env.STORAGE_MODE || 'file',

  // MongoDB 配置
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/storyboard-app',
    options: {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },

  // 文件存储配置
  fileStorage: {
    projectsFile: './projects.json',
    backupDir: './backups',
    autoBackup: true,
    backupInterval: 3600000 // 1小时
  },

  // 数据验证配置
  validation: {
    script: {
      minLength: 10,
      maxLength: 50000
    },
    characterName: {
      minLength: 1,
      maxLength: 100
    },
    characterDescription: {
      maxLength: 500
    }
  },

  // 文件上传配置
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    uploadDir: './uploads',
    outputDir: './outputs'
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

// ============ 初始化函数 ============

async function initializeStorage() {
  const StorageManager = require('./storage');
  
  let useDatabase = false;

  // 如果配置为 MongoDB 模式，尝试连接
  if (config.storageMode === 'mongodb') {
    try {
      const { connectDatabase } = require('./database');
      const connected = await connectDatabase();
      useDatabase = connected;
      
      if (useDatabase) {
        console.log('📊 使用 MongoDB 作为数据存储');
      } else {
        console.log('⚠️  MongoDB 连接失败，降级到文件存储');
      }
    } catch (error) {
      console.error('初始化 MongoDB 失败:', error.message);
      console.log('⚠️  降级到文件存储');
    }
  } else {
    console.log('📁 使用本地文件存储');
  }

  return new StorageManager(useDatabase);
}

// ============ 备份函数 ============

function setupAutoBackup(storageManager) {
  if (!config.fileStorage.autoBackup || storageManager.useDatabase) {
    return;
  }

  const fs = require('fs');
  const path = require('path');

  // 确保备份目录存在
  if (!fs.existsSync(config.fileStorage.backupDir)) {
    fs.mkdirSync(config.fileStorage.backupDir, { recursive: true });
  }

  // 定期备份
  setInterval(() => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        config.fileStorage.backupDir,
        `projects_backup_${timestamp}.json`
      );

      const projectsFile = config.fileStorage.projectsFile;
      if (fs.existsSync(projectsFile)) {
        fs.copyFileSync(projectsFile, backupFile);
        console.log(`✅ 项目数据已备份: ${backupFile}`);

        // 只保留最近 10 个备份
        const backups = fs.readdirSync(config.fileStorage.backupDir)
          .filter(f => f.startsWith('projects_backup_'))
          .sort()
          .reverse();

        if (backups.length > 10) {
          const oldBackup = backups[10];
          fs.unlinkSync(path.join(config.fileStorage.backupDir, oldBackup));
          console.log(`🗑️  删除旧备份: ${oldBackup}`);
        }
      }
    } catch (error) {
      console.error('备份失败:', error.message);
    }
  }, config.fileStorage.backupInterval);
}

// ============ 数据迁移函数 ============

async function migrateToDatabase(storageManager) {
  if (!storageManager.useDatabase) {
    console.log('⚠️  当前使用文件存储，无需迁移');
    return;
  }

  try {
    const fs = require('fs');
    const projectsFile = config.fileStorage.projectsFile;

    if (!fs.existsSync(projectsFile)) {
      console.log('📁 没有找到本地项目文件，无需迁移');
      return;
    }

    const data = fs.readFileSync(projectsFile, 'utf-8');
    const projects = JSON.parse(data);

    console.log(`📤 开始迁移 ${projects.length} 个项目到 MongoDB...`);

    const { Project } = require('./database');
    let successCount = 0;
    let errorCount = 0;

    for (const project of projects) {
      try {
        const existingProject = await Project.findOne({ id: project.id });
        if (!existingProject) {
          await Project.create(project);
          successCount++;
        }
      } catch (error) {
        console.error(`迁移项目 ${project.id} 失败:`, error.message);
        errorCount++;
      }
    }

    console.log(`✅ 迁移完成: 成功 ${successCount} 个，失败 ${errorCount} 个`);

    // 备份原文件
    const backupFile = `${projectsFile}.backup`;
    fs.copyFileSync(projectsFile, backupFile);
    console.log(`📁 原文件已备份到: ${backupFile}`);
  } catch (error) {
    console.error('数据迁移失败:', error.message);
  }
}

// ============ 导出 ============

module.exports = {
  config,
  initializeStorage,
  setupAutoBackup,
  migrateToDatabase
};
