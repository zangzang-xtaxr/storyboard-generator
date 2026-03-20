// =====================================================
// PM2 进程管理配置
// 适用于: 自有 VPS / 云主机 (阿里云 / 腾讯云 / AWS EC2)
//
// 常用命令:
//   pm2 start ecosystem.config.js --env production
//   pm2 reload ecosystem.config.js --env production
//   pm2 logs storyboard-app
//   pm2 monit
// =====================================================

module.exports = {
  apps: [
    {
      name: 'storyboard-app',
      script: 'server.js',
      instances: 'max',           // 根据 CPU 核数自动扩展
      exec_mode: 'cluster',       // 集群模式，利用多核
      watch: false,               // 生产环境禁用文件监听
      max_memory_restart: '500M', // 超过 500MB 自动重启

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        STORAGE_MODE: 'file',
      },

      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // 异常退出后自动重启
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,

      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 8000,
      shutdown_with_message: true,
    },
  ],
};
