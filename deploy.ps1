# =====================================================
# AI 分镜生成器 - 一键部署脚本
# 支持: Render / Railway / Fly.io / Docker
# 用法: .\deploy.ps1 -Platform render
# =====================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("render", "railway", "flyio", "docker", "github")]
    [string]$Platform = "github"
)

$AppName = "storyboard-app"
$RepoName = "storyboard-generator"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     AI 分镜生成器 - 云平台部署脚本              ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

function Check-Command($cmd) {
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

# ---- 推送到 GitHub ----
function Deploy-GitHub {
    Write-Host "[1/3] 检查 GitHub CLI..." -ForegroundColor Yellow
    if (-not (Check-Command "gh")) {
        Write-Host "  ❌ 未找到 GitHub CLI (gh)" -ForegroundColor Red
        Write-Host "  请访问 https://cli.github.com/ 安装后重试" -ForegroundColor Gray
        return $false
    }

    Write-Host "[2/3] 创建 GitHub 仓库并推送..." -ForegroundColor Yellow
    $remoteExists = git remote get-url origin 2>$null
    if (-not $remoteExists) {
        gh repo create $RepoName --public --source=. --remote=origin --push
        if ($LASTEXITCODE -ne 0) {
            Write-Host "  ❌ 创建仓库失败，请检查 gh auth status" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "  远程仓库已存在，直接推送..." -ForegroundColor Gray
        git push origin main
    }

    Write-Host "[3/3] 获取仓库地址..." -ForegroundColor Yellow
    $repoUrl = gh repo view --json url -q .url 2>$null
    Write-Host ""
    Write-Host "  ✅ 代码已推送到 GitHub!" -ForegroundColor Green
    Write-Host "  仓库地址: $repoUrl" -ForegroundColor Cyan
    return $true
}

# ---- Render 部署 ----
function Deploy-Render {
    Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  Render.com 部署步骤:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. 访问 https://render.com" -ForegroundColor White
    Write-Host "  2. 点击 'New +' -> 'Blueprint'" -ForegroundColor White
    Write-Host "  3. 连接你的 GitHub 仓库: $RepoName" -ForegroundColor White
    Write-Host "  4. Render 会自动读取 render.yaml 配置" -ForegroundColor White
    Write-Host "  5. 在 Environment 设置以下变量:" -ForegroundColor White
    Write-Host "     CLAUDE_API_KEY = <your-key>" -ForegroundColor Yellow
    Write-Host "     JWT_SECRET     = <random-32-chars>" -ForegroundColor Yellow
    Write-Host "  6. 点击 'Apply' 开始部署" -ForegroundColor White
    Write-Host ""
    Write-Host "  预计部署时间: 5-8 分钟" -ForegroundColor Gray
    Write-Host "  免费套餐: 512MB RAM, 自动休眠" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

# ---- Railway 部署 ----
function Deploy-Railway {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  Railway.app 部署步骤:" -ForegroundColor Cyan
    Write-Host ""
    if (Check-Command "railway") {
        Write-Host "  检测到 Railway CLI，尝试自动部署..." -ForegroundColor Green
        railway login
        railway init --name $AppName
        railway up
        Write-Host "  ✅ Railway 部署已触发!" -ForegroundColor Green
    } else {
        Write-Host "  1. 访问 https://railway.app" -ForegroundColor White
        Write-Host "  2. 点击 'New Project' -> 'Deploy from GitHub repo'" -ForegroundColor White
        Write-Host "  3. 选择仓库: $RepoName" -ForegroundColor White
        Write-Host "  4. 添加环境变量:" -ForegroundColor White
        Write-Host "     CLAUDE_API_KEY = <your-key>" -ForegroundColor Yellow
        Write-Host "     JWT_SECRET     = <random-32-chars>" -ForegroundColor Yellow
        Write-Host "     NODE_ENV       = production" -ForegroundColor Yellow
        Write-Host "  5. Railway 自动检测 Dockerfile 并构建" -ForegroundColor White
        Write-Host ""
        Write-Host "  或安装 Railway CLI:" -ForegroundColor Gray
        Write-Host "  npm install -g @railway/cli" -ForegroundColor Gray
        Write-Host "  railway login; railway up" -ForegroundColor Gray
    }
    Write-Host "  免费额度: `$5/月 (约 500 小时)" -ForegroundColor Gray
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

# ---- Fly.io 部署 ----
function Deploy-Flyio {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  Fly.io 部署步骤:" -ForegroundColor Cyan
    Write-Host ""
    if (Check-Command "flyctl") {
        Write-Host "  检测到 flyctl CLI，开始部署..." -ForegroundColor Green
        flyctl auth login
        flyctl launch --name $AppName --region nrt --no-deploy
        flyctl secrets set NODE_ENV=production STORAGE_MODE=file
        Write-Host "  请设置必需密钥:" -ForegroundColor Yellow
        Write-Host "  flyctl secrets set CLAUDE_API_KEY=<your-key>" -ForegroundColor Yellow
        Write-Host "  flyctl secrets set JWT_SECRET=<random-32-chars>" -ForegroundColor Yellow
        flyctl deploy
        Write-Host "  ✅ Fly.io 部署已触发!" -ForegroundColor Green
        flyctl status
    } else {
        Write-Host "  1. 安装 flyctl:" -ForegroundColor White
        Write-Host "     powershell -Command `"iwr https://fly.io/install.ps1 -useb | iex`"" -ForegroundColor Gray
        Write-Host "  2. 登录: flyctl auth login" -ForegroundColor White
        Write-Host "  3. 在此目录执行:" -ForegroundColor White
        Write-Host "     flyctl launch" -ForegroundColor Gray
        Write-Host "     flyctl secrets set CLAUDE_API_KEY=<key> JWT_SECRET=<secret>" -ForegroundColor Gray
        Write-Host "     flyctl deploy" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  免费套餐: 3 个 shared-cpu-1x 256MB 实例" -ForegroundColor Gray
    }
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

# ---- Docker 本地部署 ----
function Deploy-Docker {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "  Docker 本地/服务器部署:" -ForegroundColor Cyan
    Write-Host ""
    if (Check-Command "docker") {
        Write-Host "  检测到 Docker，开始构建..." -ForegroundColor Green
        if (-not (Test-Path ".env")) {
            Copy-Item ".env.example" ".env"
            Write-Host "  ⚠️  已从 .env.example 创建 .env，请编辑填写 API Key" -ForegroundColor Yellow
            Write-Host "  编辑完成后重新运行此脚本" -ForegroundColor Yellow
            notepad .env
            return
        }
        docker compose up -d --build
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "  ✅ Docker 容器已启动!" -ForegroundColor Green
            Write-Host "  访问地址: http://localhost:3000" -ForegroundColor Cyan
            docker compose ps
        } else {
            Write-Host "  ❌ Docker 构建失败，请检查 Docker 是否运行" -ForegroundColor Red
        }
    } else {
        Write-Host "  请先安装 Docker Desktop:" -ForegroundColor Red
        Write-Host "  https://www.docker.com/products/docker-desktop" -ForegroundColor Gray
    }
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
}

# ---- 主流程 ----
switch ($Platform) {
    "github" {
        $ok = Deploy-GitHub
        if ($ok) {
            Write-Host ""
            Write-Host "  接下来选择部署平台:" -ForegroundColor Cyan
            Write-Host "  .\deploy.ps1 -Platform render    # 推荐，有免费套餐" -ForegroundColor White
            Write-Host "  .\deploy.ps1 -Platform railway   # 每月 \$5 额度" -ForegroundColor White
            Write-Host "  .\deploy.ps1 -Platform flyio     # 全球 CDN" -ForegroundColor White
            Write-Host "  .\deploy.ps1 -Platform docker    # 本地/VPS" -ForegroundColor White
        }
    }
    "render"  { Deploy-Render }
    "railway" { Deploy-Railway }
    "flyio"   { Deploy-Flyio }
    "docker"  { Deploy-Docker }
}

Write-Host ""
