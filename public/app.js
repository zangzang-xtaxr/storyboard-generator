/**
 * AI 分镜生成器 - 前端应用
 * 功能：人物上传、脚本输入、分镜生成、图片生成、视频生成
 */

// ========================================
// 全局状态
// ========================================

const AppState = {
  currentStep: 1,
  projectId: null,
  characterViews: {
    front: null,
    side: null,
    back: null
  },
  script: null,
  storyboard: [],
  generatedImages: [],
  generatedVideos: [],
  currentEditingShot: null,
  isGenerating: false
};

// ========================================
// 初始化
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // 认证系统先初始化，登录成功后再启动主应用
  window.onUserLoggedIn = function(user) {
    // 更新 header 区域显示用户名
    const headerRight = document.querySelector('.header-right');
    if (headerRight && !document.getElementById('headerUser')) {
      const userBadge = document.createElement('span');
      userBadge.id = 'headerUser';
      userBadge.style.cssText = 'font-size:13px;color:var(--text-secondary);padding:4px 10px;background:var(--bg-tertiary);border-radius:6px;';
      userBadge.textContent = user.username;
      headerRight.prepend(userBadge);
    }
    initApp();
  };

  if (typeof initAuth === 'function') {
    initAuth();
  } else {
    initApp();
  }
});

function initApp() {
  initNavigation();
  initUploadArea();
  initScriptTabs();
  initSceneList();
  initModals();
  initSliders();
  initButtons();
  generateProjectId();
}

function generateProjectId() {
  AppState.projectId = 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
  document.getElementById('projectId').textContent = AppState.projectId;
}

// ========================================
// 导航和步骤切换
// ========================================

function initNavigation() {
  // 侧边栏导航
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const step = parseInt(item.dataset.step);
      goToStep(step);
    });
  });

  // 进度条点击
  document.querySelectorAll('.progress-step').forEach(step => {
    step.addEventListener('click', () => {
      const stepNum = parseInt(step.dataset.step);
      goToStep(stepNum);
    });
  });
}

function goToStep(step) {
  // 验证是否可以进入该步骤
  if (!canAccessStep(step)) {
    showToast('请先完成前面的步骤', 'warning');
    return;
  }

  AppState.currentStep = step;

  // 更新侧边栏
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (parseInt(item.dataset.step) === step) {
      item.classList.add('active');
    }
  });

  // 更新进度条
  document.querySelectorAll('.progress-step').forEach((item, index) => {
    item.classList.remove('active', 'completed');
    const itemStep = parseInt(item.dataset.step);
    if (itemStep === step) {
      item.classList.add('active');
    } else if (itemStep < step) {
      item.classList.add('completed');
    }
  });

  // 更新内容区
  document.querySelectorAll('.step-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`step${step}`).classList.add('active');

  // 更新页面标题
  const titles = {
    1: '人物设定',
    2: '剧情脚本',
    3: '分镜脚本',
    4: '分镜图片',
    5: '视频生成'
  };
  document.getElementById('pageTitle').textContent = titles[step];

  // 步骤特定初始化
  if (step === 3) {
    renderStoryboard();
  } else if (step === 4) {
    renderImages();
  } else if (step === 5) {
    renderVideos();
  }
}

function canAccessStep(step) {
  if (step === 1) return true;
  if (step === 2) return AppState.characterViews.front || AppState.characterViews.side || AppState.characterViews.back;
  if (step === 3) return AppState.script !== null;
  if (step === 4) return AppState.storyboard.length > 0;
  if (step === 5) return AppState.generatedImages.length > 0;
  return false;
}

// ========================================
// 文件上传
// ========================================

function initUploadArea() {
  const views = ['front', 'side', 'back'];

  views.forEach(view => {
    const uploadArea = document.getElementById(`${view}Upload`);
    const input = document.getElementById(`${view}Input`);

    // 点击上传
    uploadArea.addEventListener('click', () => {
      input.click();
    });

    // 文件选择
    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileUpload(view, e.target.files[0]);
      }
    });

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');

      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
          handleFileUpload(view, file);
        } else {
          showToast('请上传图片文件', 'error');
        }
      }
    });

    // 删除按钮
    const removeBtn = uploadArea.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFile(view);
      });
    }
  });

  // 上传按钮
  document.getElementById('uploadCharacterBtn').addEventListener('click', uploadCharacterViews);
}

function handleFileUpload(view, file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    AppState.characterViews[view] = {
      file: file,
      preview: e.target.result
    };
    updateUploadPreview(view, e.target.result);
    updateUploadButton();
  };
  reader.readAsDataURL(file);
}

function updateUploadPreview(view, src) {
  const uploadArea = document.getElementById(`${view}Upload`);
  const preview = uploadArea.querySelector('.upload-preview');
  const placeholder = uploadArea.querySelector('.upload-placeholder');
  const img = preview.querySelector('img');

  img.src = src;
  preview.classList.remove('hidden');
  placeholder.classList.add('hidden');
  uploadArea.closest('.upload-card').classList.add('has-file');
}

function removeFile(view) {
  AppState.characterViews[view] = null;

  const uploadArea = document.getElementById(`${view}Upload`);
  const preview = uploadArea.querySelector('.upload-preview');
  const placeholder = uploadArea.querySelector('.upload-placeholder');
  const input = document.getElementById(`${view}Input`);

  preview.classList.add('hidden');
  placeholder.classList.remove('hidden');
  uploadArea.closest('.upload-card').classList.remove('has-file');
  input.value = '';

  updateUploadButton();
}

function updateUploadButton() {
  const hasFiles = AppState.characterViews.front || AppState.characterViews.side || AppState.characterViews.back;
  const btn = document.getElementById('uploadCharacterBtn');
  btn.disabled = !hasFiles;
}

async function uploadCharacterViews() {
  showLoading('正在上传人物视图...');

  try {
    const formData = new FormData();
    if (AppState.characterViews.front?.file) formData.append('frontView', AppState.characterViews.front.file);
    if (AppState.characterViews.side?.file) formData.append('sideView', AppState.characterViews.side.file);
    if (AppState.characterViews.back?.file) formData.append('backView', AppState.characterViews.back.file);

    // 调用后端 API
    const result = await api.uploadCharacter(formData);
    if (!result.success) throw new Error(result.error || '上传失败');

    hideLoading();
    showToast('人物视图上传成功', 'success');
    goToStep(2);
  } catch (error) {
    hideLoading();
    console.error('上传错误:', error);
    showToast('上传失败: ' + error.message, 'error');
  }
}

// ========================================
// 脚本输入
// ========================================

function initScriptTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;

      // 更新按钮状态
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 更新内容
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`${tab}Tab`).classList.add('active');
    });
  });

  document.getElementById('submitScriptBtn').addEventListener('click', submitScript);
}

function initSceneList() {
  document.getElementById('addSceneBtn').addEventListener('click', addScene);
}

function addScene() {
  const sceneList = document.getElementById('sceneList');
  const sceneCount = sceneList.children.length + 1;

  const sceneItem = document.createElement('div');
  sceneItem.className = 'scene-item';
  sceneItem.innerHTML = `
    <div class="scene-header">
      <span class="scene-num">场景 ${sceneCount}</span>
      <button class="btn-icon remove-scene"><i class="fas fa-trash"></i></button>
    </div>
    <input type="text" class="scene-location" placeholder="地点：例如 - 卧室">
    <textarea class="scene-desc" placeholder="场景描述..."></textarea>
  `;

  sceneItem.querySelector('.remove-scene').addEventListener('click', () => {
    sceneItem.remove();
    updateSceneNumbers();
  });

  sceneList.appendChild(sceneItem);
}

function updateSceneNumbers() {
  document.querySelectorAll('.scene-item').forEach((item, index) => {
    item.querySelector('.scene-num').textContent = `场景 ${index + 1}`;
  });
}

async function submitScript() {
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  let scriptContent = '';

  if (activeTab === 'simple') {
    scriptContent = document.getElementById('simpleScript').value.trim();
  } else if (activeTab === 'detailed') {
    scriptContent = document.getElementById('detailedScript').value.trim();
  } else if (activeTab === 'scene') {
    const scenes = [];
    document.querySelectorAll('.scene-item').forEach(item => {
      const location = item.querySelector('.scene-location').value;
      const desc = item.querySelector('.scene-desc').value;
      if (location || desc) {
        scenes.push(`场景：${location}\n${desc}`);
      }
    });
    scriptContent = scenes.join('\n\n');
  }

  if (!scriptContent) {
    showToast('请输入剧情内容', 'warning');
    return;
  }

  AppState.script = { content: scriptContent, type: activeTab };
  showLoading('AI正在分析剧本并生成分镜脚本...');

  try {
    // 调用后端 API 提交脚本
    const scriptResult = await api.submitScript(AppState.projectId, scriptContent, activeTab);
    if (!scriptResult.success) throw new Error(scriptResult.error || '提交脚本失败');

    // 调用后端 API 生成分镜
    const storyboardResult = await api.generateStoryboard(AppState.projectId);
    if (!storyboardResult.success) throw new Error(storyboardResult.error || '生成分镜失败');

    AppState.storyboard = storyboardResult.storyboard.scenes;
    hideLoading();
    showToast('分镜脚本生成成功', 'success');
    goToStep(3);
  } catch (error) {
    hideLoading();
    console.error('生成分镜错误:', error);
    showToast('生成失败: ' + error.message, 'error');
  }
}

function generateMockStoryboard(script) {
  // 简单的分镜生成逻辑（模拟AI解析）
  const scenes = [];
  const paragraphs = script.split(/\n\n+/).filter(p => p.trim());

  const cameraAngles = ['全景', '中景', '近景', '特写', '大特写'];
  const durations = [2, 3, 4, 5];

  paragraphs.forEach((para, index) => {
    const lines = para.split('\n').filter(l => l.trim());
    const location = lines[0].includes('：') || lines[0].includes(':')
      ? lines[0].split(/[：:]/)[1]
      : `场景${index + 1}`;
    const description = lines.slice(1).join(' ') || para;

    scenes.push({
      id: `scene_${index + 1}`,
      sceneNumber: index + 1,
      location: location,
      description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
      action: '',
      camera: cameraAngles[index % cameraAngles.length],
      duration: durations[index % durations.length],
      characters: [],
      dialogue: '',
      notes: ''
    });
  });

  // 确保至少有3个场景用于演示
  while (scenes.length < 3) {
    scenes.push({
      id: `scene_${scenes.length + 1}`,
      sceneNumber: scenes.length + 1,
      location: `场景${scenes.length + 1}`,
      description: '延续上一场景的动作和情绪',
      action: '',
      camera: cameraAngles[scenes.length % cameraAngles.length],
      duration: 3,
      characters: [],
      dialogue: '',
      notes: ''
    });
  }

  return scenes;
}

// ========================================
// 分镜脚本渲染和编辑
// ========================================

function renderStoryboard() {
  const grid = document.getElementById('storyboardGrid');
  grid.innerHTML = '';

  AppState.storyboard.forEach(shot => {
    const card = createShotCard(shot);
    grid.appendChild(card);
  });
}

function createShotCard(shot) {
  const card = document.createElement('div');
  card.className = 'shot-card';
  card.dataset.id = shot.id;
  card.innerHTML = `
    <div class="shot-header">
      <span class="shot-number">镜头 ${shot.sceneNumber}</span>
      <span class="shot-duration">${shot.duration}秒</span>
    </div>
    <div class="shot-body">
      <div class="shot-location">
        <i class="fas fa-map-marker-alt"></i> ${shot.location}
      </div>
      <div class="shot-desc">${shot.description}</div>
      ${shot.action ? `<div class="shot-action">【${shot.action}】</div>` : ''}
      <span class="shot-camera">
        <i class="fas fa-video"></i> ${shot.camera}
      </span>
    </div>
    <div class="shot-footer">
      <span class="shot-status">待生成</span>
      <div class="shot-actions">
        <button class="btn-icon" onclick="editShot('${shot.id}')" title="编辑">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon" onclick="deleteShot('${shot.id}')" title="删除">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `;

  return card;
}

function editShot(shotId) {
  const shot = AppState.storyboard.find(s => s.id === shotId);
  if (!shot) return;

  AppState.currentEditingShot = shot;

  // 填充表单
  document.getElementById('editShotNumber').value = shot.sceneNumber;
  document.getElementById('editShotLocation').value = shot.location;
  document.getElementById('editShotDesc').value = shot.description;
  document.getElementById('editShotAction').value = shot.action;
  document.getElementById('editShotCamera').value = shot.camera;
  document.getElementById('editShotDuration').value = shot.duration;
  document.getElementById('editShotDialogue').value = shot.dialogue;
  document.getElementById('editShotNotes').value = shot.notes;

  document.getElementById('shotModal').classList.add('active');
}

function saveShot() {
  if (!AppState.currentEditingShot) return;

  const shot = AppState.currentEditingShot;
  shot.location = document.getElementById('editShotLocation').value;
  shot.description = document.getElementById('editShotDesc').value;
  shot.action = document.getElementById('editShotAction').value;
  shot.camera = document.getElementById('editShotCamera').value;
  shot.duration = parseInt(document.getElementById('editShotDuration').value);
  shot.dialogue = document.getElementById('editShotDialogue').value;
  shot.notes = document.getElementById('editShotNotes').value;

  renderStoryboard();
  closeModal();
  showToast('分镜已保存', 'success');
}

function deleteShot(shotId) {
  if (!confirm('确定要删除这个镜头吗？')) return;

  AppState.storyboard = AppState.storyboard.filter(s => s.id !== shotId);
  renderStoryboard();
  showToast('分镜已删除', 'success');
}

// ========================================
// 图片生成
// ========================================

function initButtons() {
  // 生成图片按钮
  document.getElementById('generateImagesBtn').addEventListener('click', generateImages);

  // 重新生成全部
  document.getElementById('regenerateAllBtn').addEventListener('click', () => {
    AppState.generatedImages = [];
    generateImages();
  });

  // 生成视频按钮
  document.getElementById('generateVideosBtn').addEventListener('click', () => {
    goToStep(5);
  });

  // 生成全部视频
  document.getElementById('generateAllVideosBtn').addEventListener('click', generateAllVideos);

  // 新建项目
  document.getElementById('newProjectBtn').addEventListener('click', () => {
    if (confirm('确定要新建项目吗？当前项目数据将丢失。')) {
      location.reload();
    }
  });
}

async function generateImages() {
  if (AppState.isGenerating) return;

  AppState.isGenerating = true;
  showLoading('正在生成分镜图片...');

  const style = document.getElementById('styleSelect').value;
  AppState.generatedImages = [];
  renderImages();

  try {
    // 调用后端 API 生成图片
    const result = await api.generateImages(AppState.projectId, null, style);
    if (!result.success) throw new Error(result.error || '生成图片失败');

    AppState.generatedImages = result.images;
    renderImages();
    hideLoading();
    AppState.isGenerating = false;
    showToast('所有分镜图生成完成', 'success');
  } catch (error) {
    hideLoading();
    AppState.isGenerating = false;
    console.error('生成图片错误:', error);
    showToast('生成失败: ' + error.message, 'error');
  }
}

function generatePlaceholderImage(shot, style) {
  // 生成SVG占位图
  const colors = {
    anime: ['#FFD1DC', '#C7CEEA', '#B5EAD7'],
    realistic: ['#E8E8E8', '#D4D4D4', '#C0C0C0'],
    watercolor: ['#FFE4E1', '#E6E6FA', '#F0FFF0'],
    sketch: ['#F5F5F5', '#EBEBEB', '#E0E0E0'],
    pixel: ['#FFB6C1', '#DDA0DD', '#98FB98']
  };

  const palette = colors[style] || colors.anime;
  const color = palette[shot.sceneNumber % palette.length];

  return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect fill="${encodeURIComponent(color)}" width="640" height="360"/><text x="320" y="170" font-family="Arial" font-size="20" fill="%23666" text-anchor="middle">镜头 ${shot.sceneNumber}</text><text x="320" y="200" font-family="Arial" font-size="14" fill="%23999" text-anchor="middle">${encodeURIComponent(shot.camera)}</text></svg>`;
}

function renderImages() {
  const grid = document.getElementById('imagesGrid');
  grid.innerHTML = '';

  AppState.generatedImages.forEach(img => {
    const card = createImageCard(img);
    grid.appendChild(card);
  });

  // 添加未生成图片的占位
  const remaining = AppState.storyboard.filter(
    shot => !AppState.generatedImages.find(img => img.sceneId === shot.id)
  );

  remaining.forEach(shot => {
    const placeholder = createImagePlaceholder(shot);
    grid.appendChild(placeholder);
  });
}

function createImageCard(img) {
  const card = document.createElement('div');
  card.className = 'image-card';
  card.innerHTML = `
    <div class="image-container">
      <img src="${img.url}" alt="镜头 ${img.sceneNumber}" loading="lazy">
      <div class="image-overlay">
        <div class="image-actions">
          <button onclick="previewImage('${img.id}')" title="预览">
            <i class="fas fa-eye"></i>
          </button>
          <button onclick="downloadImage('${img.id}')" title="下载">
            <i class="fas fa-download"></i>
          </button>
          <button onclick="regenerateImage('${img.id}')" title="重新生成">
            <i class="fas fa-redo"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="image-info">
      <div class="image-scene">镜头 ${img.sceneNumber}</div>
      <div class="image-prompt">${img.prompt.substring(0, 80)}...</div>
    </div>
  `;
  return card;
}

function createImagePlaceholder(shot) {
  const card = document.createElement('div');
  card.className = 'image-card generating';
  card.innerHTML = `
    <div class="image-container">
      <div class="loading-placeholder">
        <div class="spinner"></div>
        <span>生成中...</span>
      </div>
    </div>
    <div class="image-info">
      <div class="image-scene">镜头 ${shot.sceneNumber}</div>
      <div class="image-prompt">等待生成...</div>
    </div>
  `;
  return card;
}

function previewImage(imageId) {
  const img = AppState.generatedImages.find(i => i.id === imageId);
  if (!img) return;

  document.getElementById('previewImage').src = img.url;
  document.getElementById('imagePrompt').textContent = img.prompt;
  document.getElementById('imageSeed').textContent = img.seed;

  document.getElementById('imageModal').classList.add('active');
}

function regenerateImage(imageId) {
  showToast('重新生成功能需要集成AI图像API', 'info');
}

function downloadImage(imageId) {
  const img = AppState.generatedImages.find(i => i.id === imageId);
  if (!img) return;

  const link = document.createElement('a');
  link.href = img.url;
  link.download = `shot_${img.sceneNumber}_${img.seed}.png`;
  link.click();

  showToast('图片下载开始', 'success');
}

// ========================================
// 视频生成
// ========================================

function initSliders() {
  const durationSlider = document.getElementById('videoDuration');
  const durationValue = document.getElementById('durationValue');

  durationSlider.addEventListener('input', () => {
    durationValue.textContent = `${durationSlider.value}秒`;
  });

  const motionSlider = document.getElementById('motionStrength');
  const motionValue = document.getElementById('motionValue');

  motionSlider.addEventListener('input', () => {
    const val = parseInt(motionSlider.value);
    let text = '低';
    if (val > 33) text = '中等';
    if (val > 66) text = '高';
    motionValue.textContent = text;
  });
}

function renderVideos() {
  const grid = document.getElementById('videoGrid');
  grid.innerHTML = '';

  // 为每个已生成的图片创建视频卡片
  AppState.generatedImages.forEach(img => {
    const existingVideo = AppState.generatedVideos.find(v => v.imageId === img.id);
    const card = createVideoCard(img, existingVideo);
    grid.appendChild(card);
  });
}

function createVideoCard(image, video) {
  const card = document.createElement('div');
  card.className = 'video-card';

  const hasVideo = video && video.url;

  card.innerHTML = `
    <div class="video-container">
      ${hasVideo
        ? `<video src="${video.url}" loop muted></video>`
        : `<div class="video-placeholder">
             <i class="fas fa-film" style="font-size: 32px;"></i>
             <span>视频待生成</span>
           </div>`
      }
      ${hasVideo
        ? `<div class="play-overlay">
             <button class="play-btn" onclick="playVideo(this)">
               <i class="fas fa-play"></i>
             </button>
           </div>`
        : ''
      }
    </div>
    <div class="video-info">
      <div class="video-scene">镜头 ${image.sceneNumber}</div>
      <div class="video-meta">
        ${hasVideo
          ? `<span><i class="fas fa-clock"></i> ${video.duration}s</span>
             <span><i class="fas fa-play-circle"></i> ${video.fps}fps</span>`
          : '<span><i class="fas fa-image"></i> 等待生成</span>'
        }
      </div>
    </div>
  `;

  return card;
}

async function generateAllVideos() {
  if (AppState.isGenerating) return;

  AppState.isGenerating = true;
  showLoading('正在生成视频，请稍候...');

  const duration = parseFloat(document.getElementById('videoDuration').value);
  const motionStrength = parseInt(document.getElementById('motionStrength').value) / 100;
  const fps = parseInt(document.getElementById('fpsSelect').value);

  try {
    // 调用后端 API 生成视频
    const result = await api.generateAllVideos(AppState.projectId, {
      duration,
      motionStrength,
      fps
    });

    if (!result.success) throw new Error(result.error || '生成视频失败');

    AppState.generatedVideos = result.videos;
    renderVideos();
    hideLoading();
    AppState.isGenerating = false;
    showToast('所有视频生成完成', 'success');
  } catch (error) {
    hideLoading();
    AppState.isGenerating = false;
    console.error('生成视频错误:', error);
    showToast('生成失败: ' + error.message, 'error');
  }
}

function playVideo(btn) {
  const video = btn.closest('.video-container').querySelector('video');
  if (video.paused) {
    video.play();
    btn.innerHTML = '<i class="fas fa-pause"></i>';
  } else {
    video.pause();
    btn.innerHTML = '<i class="fas fa-play"></i>';
  }

  video.onended = () => {
    btn.innerHTML = '<i class="fas fa-play"></i>';
  };
}

// ========================================
// 模态框
// ========================================

function initModals() {
  // 点击模态框外部关闭
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

function closeModal() {
  document.getElementById('shotModal').classList.remove('active');
  AppState.currentEditingShot = null;
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}

// ========================================
// 工具函数
// ========================================

function simulateAPIcall(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}

function showLoading(text = '处理中...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: 'check-circle',
    error: 'exclamation-circle',
    warning: 'exclamation-triangle',
    info: 'info-circle'
  };

  toast.innerHTML = `
    <i class="fas fa-${icons[type]}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// 导出函数到全局作用域（用于HTML事件处理）
window.goToStep = goToStep;
window.editShot = editShot;
window.saveShot = saveShot;
window.deleteShot = deleteShot;
window.closeModal = closeModal;
window.previewImage = previewImage;
window.regenerateImage = regenerateImage;
window.downloadImage = downloadImage;
window.closeImageModal = closeImageModal;
window.playVideo = playVideo;
