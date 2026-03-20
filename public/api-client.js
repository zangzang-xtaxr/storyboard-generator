/**
 * API 客户端 - 与后端通信
 */

class APIClient {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.timeout = 30000; // 30 秒超时
  }

  /**
   * 发送 HTTP 请求
   */
  async request(method, endpoint, data = null, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    // 附加 JWT token
    const token = (window.Auth && window.Auth.getToken()) ? window.Auth.getToken() : null;
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers
      },
      timeout: this.timeout
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API 请求失败: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  /**
   * 上传人物三视图
   */
  async uploadCharacter(formData) {
    const url = `${this.baseURL}/api/upload-character`;
    const token = (window.Auth && window.Auth.getToken()) ? window.Auth.getToken() : null;
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { ...authHeaders },
        body: formData
        // 注意: 不要设置 Content-Type，让浏览器自动设置
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('上传人物视图失败:', error);
      throw error;
    }
  }

  /**
   * 提交剧情脚本
   */
  async submitScript(projectId, script, scriptType = 'simple') {
    return this.request('POST', '/api/submit-script', {
      projectId,
      script,
      scriptType
    });
  }

  /**
   * 生成分镜脚本
   */
  async generateStoryboard(projectId) {
    return this.request('POST', '/api/generate-storyboard', {
      projectId
    });
  }

  /**
   * 生成分镜图片
   */
  async generateImages(projectId, sceneIds = null, style = 'anime') {
    return this.request('POST', '/api/generate-images', {
      projectId,
      sceneIds,
      style
    });
  }

  /**
   * 生成单个视频
   */
  async generateVideo(projectId, sceneId, options = {}) {
    return this.request('POST', '/api/generate-video', {
      projectId,
      sceneId,
      options
    });
  }

  /**
   * 批量生成视频
   */
  async generateAllVideos(projectId, options = {}) {
    return this.request('POST', '/api/generate-all-videos', {
      projectId,
      options
    });
  }

  /**
   * 获取项目状态
   */
  async getProject(projectId) {
    return this.request('GET', `/api/project/${projectId}`);
  }

  /**
   * 获取项目详细信息
   */
  async getProjectDetails(projectId) {
    return this.request('GET', `/api/project/${projectId}/details`);
  }

  /**
   * 获取所有项目
   */
  async getAllProjects() {
    return this.request('GET', '/api/projects');
  }

  /**
   * 导出项目
   */
  async exportProject(projectId, format = 'json') {
    return this.request('GET', `/api/export/${projectId}?format=${format}`);
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId) {
    return this.request('DELETE', `/api/project/${projectId}`);
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    return this.request('GET', '/api/admin/stats');
  }

  /**
   * 获取健康状态
   */
  async getHealth() {
    return this.request('GET', '/api/admin/health');
  }

  /**
   * 获取项目统计
   */
  async getProjectStats() {
    return this.request('GET', '/api/admin/project-stats');
  }

  /**
   * 创建备份
   */
  async createBackup() {
    return this.request('POST', '/api/admin/backup');
  }

  /**
   * 获取备份列表
   */
  async getBackups() {
    return this.request('GET', '/api/admin/backups');
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupFilename) {
    return this.request('POST', '/api/admin/restore-backup', {
      backupFilename
    });
  }

  /**
   * 清理过期数据
   */
  async cleanup(daysOld = 30) {
    return this.request('POST', '/api/admin/cleanup', {
      daysOld
    });
  }
}

// 创建全局 API 客户端实例
const api = new APIClient();

// 导出到全局作用域
window.APIClient = APIClient;
window.api = api;
