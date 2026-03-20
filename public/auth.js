/**
 * 用户认证前端模块
 * 处理登录、注册、状态管理
 */

// ============ Token 管理 ============

const Auth = {
  TOKEN_KEY: 'sb_auth_token',
  USER_KEY: 'sb_auth_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
  },

  getUser() {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clear() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  isLoggedIn() {
    return !!this.getToken();
  }
};

// ============ API 调用 ============

async function authRequest(endpoint, body) {
  const res = await fetch(`/api/auth${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function verifyToken() {
  const token = Auth.getToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.success) {
      Auth.setUser(data.user);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ============ UI 状态机 ============

let authMode = 'login'; // 'login' | 'register'

function switchAuthMode(mode) {
  authMode = mode;
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  const loginTab = document.getElementById('authTabLogin');
  const registerTab = document.getElementById('authTabRegister');
  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');

  if (mode === 'login') {
    loginForm.classList.remove('auth-form--hidden');
    registerForm.classList.add('auth-form--hidden');
    loginTab.classList.add('auth-tab--active');
    registerTab.classList.remove('auth-tab--active');
    authTitle.textContent = '欢迎回来';
    authSubtitle.textContent = '登录您的账号以继续创作';
  } else {
    loginForm.classList.add('auth-form--hidden');
    registerForm.classList.remove('auth-form--hidden');
    loginTab.classList.remove('auth-tab--active');
    registerTab.classList.add('auth-tab--active');
    authTitle.textContent = '创建账号';
    authSubtitle.textContent = '注册后即可开始 AI 分镜创作';
  }
  clearAuthErrors();
}

function clearAuthErrors() {
  document.querySelectorAll('.auth-error').forEach(el => el.textContent = '');
}

function setAuthError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function setAuthLoading(formId, loading) {
  const btn = document.querySelector(`#${formId} .auth-submit-btn`);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? '请稍候...' : (formId === 'authLoginForm' ? '登 录' : '注 册');
}

// ============ 登录处理 ============

async function handleLogin(e) {
  e.preventDefault();
  clearAuthErrors();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) return setAuthError('loginEmailError', '请输入邮箱');
  if (!password) return setAuthError('loginPasswordError', '请输入密码');

  setAuthLoading('authLoginForm', true);
  try {
    const data = await authRequest('/login', { email, password });
    if (!data.success) {
      setAuthError('loginEmailError', data.error || '登录失败');
      return;
    }
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    onAuthSuccess(data.user);
  } catch (err) {
    setAuthError('loginEmailError', '网络错误，请检查服务器是否运行');
  } finally {
    setAuthLoading('authLoginForm', false);
  }
}

// ============ 注册处理 ============

async function handleRegister(e) {
  e.preventDefault();
  clearAuthErrors();

  const username = document.getElementById('registerUsername').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirm = document.getElementById('registerConfirm').value;

  if (!username) return setAuthError('registerUsernameError', '请输入用户名');
  if (!email) return setAuthError('registerEmailError', '请输入邮箱');
  if (!password) return setAuthError('registerPasswordError', '请输入密码');
  if (password.length < 6) return setAuthError('registerPasswordError', '密码至少需要6个字符');
  if (password !== confirm) return setAuthError('registerConfirmError', '两次密码输入不一致');

  setAuthLoading('authRegisterForm', true);
  try {
    const data = await authRequest('/register', { username, email, password });
    if (!data.success) {
      setAuthError('registerEmailError', data.error || '注册失败');
      return;
    }
    Auth.setToken(data.token);
    Auth.setUser(data.user);
    onAuthSuccess(data.user);
  } catch (err) {
    setAuthError('registerEmailError', '网络错误，请检查服务器是否运行');
  } finally {
    setAuthLoading('authRegisterForm', false);
  }
}

// ============ 登出处理 ============

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
    });
  } catch {}
  Auth.clear();
  showAuthOverlay();
  updateUserInfo(null);
}

// ============ 认证成功回调 ============

function onAuthSuccess(user) {
  hideAuthOverlay();
  updateUserInfo(user);
  // 通知 app.js 可以初始化主界面
  if (typeof window.onUserLoggedIn === 'function') {
    window.onUserLoggedIn(user);
  }
}

// ============ 用户信息栏 ============

function updateUserInfo(user) {
  const infoEl = document.getElementById('sidebarUserInfo');
  if (!infoEl) return;
  if (user) {
    infoEl.innerHTML = `
      <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="user-details">
        <span class="user-name">${user.username}</span>
        <span class="user-email">${user.email}</span>
      </div>
      <button class="logout-btn" id="logoutBtn" title="退出登录">⏏</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  } else {
    infoEl.innerHTML = '';
  }
}

// ============ Overlay 显示/隐藏 ============

function showAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.add('auth-overlay--visible');
}

function hideAuthOverlay() {
  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.classList.remove('auth-overlay--visible');
}

// ============ 初始化 ============

async function initAuth() {
  // 绑定 tab 切换
  document.getElementById('authTabLogin').addEventListener('click', () => switchAuthMode('login'));
  document.getElementById('authTabRegister').addEventListener('click', () => switchAuthMode('register'));

  // 绑定表单提交
  document.getElementById('authLoginForm').addEventListener('submit', handleLogin);
  document.getElementById('authRegisterForm').addEventListener('submit', handleRegister);

  // 验证已有 token
  if (Auth.isLoggedIn()) {
    const valid = await verifyToken();
    if (valid) {
      onAuthSuccess(Auth.getUser());
      return;
    }
    Auth.clear();
  }

  showAuthOverlay();
}

// 暴露到全局
window.Auth = Auth;
window.handleLogout = handleLogout;
window.initAuth = initAuth;
