# =====================================================
# 多阶段构建 Dockerfile
# 适用于: Railway / Render / Fly.io / 任何 Docker 平台
# =====================================================

# ---- 依赖阶段 ----
FROM node:20-alpine AS deps

# 安装 sharp 所需的构建依赖
RUN apk add --no-cache \
    libc6-compat \
    vips-dev \
    python3 \
    make \
    g++

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# ---- 生产阶段 ----
FROM node:20-alpine AS runner

# 安装 sharp 运行时依赖
RUN apk add --no-cache \
    libc6-compat \
    vips

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 appuser

WORKDIR /app

# 从依赖阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules

# 复制应用源码
COPY --chown=appuser:nodejs . .

# 创建必要目录并设置权限
RUN mkdir -p uploads outputs backups logs && \
    chown -R appuser:nodejs uploads outputs backups logs

USER appuser

EXPOSE 3000

ENV NODE_ENV=production \
    PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
