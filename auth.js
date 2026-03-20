/**
 * 用户认证路由
 * 提供注册、登录、登出、获取当前用户接口
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'storyboard_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = '7d';

// ============ 用户存储（文件存储，与项目保持一致）============

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('加载用户数据失败:', err.message);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('保存用户数据失败:', err.message);
  }
}

function findUserByEmail(email) {
  const users = loadUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findUserById(id) {
  const users = loadUsers();
  return users.find(u => u.id === id) || null;
}

// ============ 输入验证 ============

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, error: '密码至少需要6个字符' };
  }
  if (password.length > 128) {
    return { valid: false, error: '密码不能超过128个字符' };
  }
  return { valid: true };
}

function validateUsername(username) {
  if (!username || username.trim().length < 2) {
    return { valid: false, error: '用户名至少需要2个字符' };
  }
  if (username.trim().length > 32) {
    return { valid: false, error: '用户名不能超过32个字符' };
  }
  return { valid: true };
}

// ============ 生成 token ============

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ============ 路由 ============

/**
 * POST /api/auth/register
 * 注册新用户
 */
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 验证输入
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ success: false, error: usernameValidation.error });
    }

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, error: '请输入有效的邮箱地址' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, error: passwordValidation.error });
    }

    // 检查邮箱是否已注册
    const existingUser = findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: '该邮箱已被注册' });
    }

    // 哈希密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const newUser = {
      id: uuidv4(),
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const users = loadUsers();
    users.push(newUser);
    saveUsers(users);

    // 生成 token
    const token = generateToken(newUser.id);

    console.log(`✅ 新用户注册: ${newUser.email}`);

    res.status(201).json({
      success: true,
      message: '注册成功',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ success: false, error: '服务器错误，请稍后重试' });
  }
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: '请输入邮箱和密码' });
    }

    // 查找用户
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: '邮箱或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: '邮箱或密码错误' });
    }

    // 生成 token
    const token = generateToken(user.id);

    console.log(`✅ 用户登录: ${user.email}`);

    res.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, error: '服务器错误，请稍后重试' });
  }
});

/**
 * GET /api/auth/me
 * 获取当前用户信息（需要认证）
 */
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '未提供认证令牌' });
    }

    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: '令牌无效或已过期' });
    }

    const user = findUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

/**
 * POST /api/auth/logout
 * 登出（客户端清除 token 即可，服务端无状态）
 */
router.post('/logout', (req, res) => {
  res.json({ success: true, message: '已退出登录' });
});

module.exports = { router, JWT_SECRET };
