# AI 分镜生成器 - PowerShell 启动脚本

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         🎬 AI 分镜生成器 - 快速启动脚本                    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js 已安装: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: Node.js 未安装" -ForegroundColor Red
    Write-Host "`n请从以下地址下载并安装 Node.js:" -ForegroundColor Yellow
    Write-Host "https://nodejs.org/" -ForegroundColor Cyan
    Read-Host "`n按 Enter 键退出"
    exit 1
}

Write-Host ""

# 检查依赖是否已安装
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 正在安装依赖..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ 依赖安装失败" -ForegroundColor Red
        Read-Host "`n按 Enter 键退出"
        exit 1
    }
    Write-Host "✅ 依赖安装完成`n" -ForegroundColor Green
}

# 启动服务器
Write-Host "🚀 正在启动服务器...`n" -ForegroundColor Yellow
Write-Host "📍 应用地址: http://localhost:3000" -ForegroundColor Cyan
Write-Host "📍 备用地址: http://127.0.0.1:3000" -ForegroundColor Cyan
Write-Host "`n💡 提示: 在浏览器中打开上述地址即可使用应用" -ForegroundColor Green
Write-Host "💡 按 Ctrl+C 可停止服务器`n" -ForegroundColor Green

npm start
