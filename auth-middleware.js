/**
 * JWT 认证中间件
 * 用于保护需要登录才能访问的 API 路由
 */

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

/**
 * requireAuth 中间件
 * 验证请求头中的 Bearer token，校验通过后将 userId 注入 req.userId
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: '请先登录后再操作',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: '登录已过期，请重新登录',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      success: false,
      error: '无效的认证令牌，请重新登录',
      code: 'INVALID_TOKEN'
    });
  }
}

module.exports = { requireAuth };
