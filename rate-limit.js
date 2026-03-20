// ============ 速率限制中间件 ============

const rateLimit = require('express-rate-limit');

// 通用速率限制 (所有请求)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制 100 个请求
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true, // 返回速率限制信息在 RateLimit-* 头中
  legacyHeaders: false // 禁用 X-RateLimit-* 头
});

// 上传文件速率限制 (更严格)
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 20, // 限制 20 个上传
  message: '上传过于频繁，请稍后再试',
  skip: (req) => req.method !== 'POST' || !req.path.includes('upload')
});

// API 速率限制 (中等)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 50, // 限制 50 个请求
  message: 'API 请求过于频繁，请稍后再试',
  skip: (req) => !req.path.startsWith('/api')
});

// 生成操作速率限制 (最严格)
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 10, // 限制 10 个生成操作
  message: '生成操作过于频繁，请稍后再试',
  skip: (req) => !req.path.includes('generate')
});

module.exports = {
  generalLimiter,
  uploadLimiter,
  apiLimiter,
  generateLimiter
};
