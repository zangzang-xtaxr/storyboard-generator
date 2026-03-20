@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║         🎬 AI 分镜生成器 - 快速启动脚本                    ║
echo ╚════════════════════════════════════════════════════════════╝
echo.

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Node.js 未安装
    echo.
    echo 请从以下地址下载并安装 Node.js:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
node --version
echo.

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
    echo.
)

REM 启动服务器
echo 🚀 正在启动服务器...
echo.
echo 📍 应用地址: http://localhost:3000
echo 📍 备用地址: http://127.0.0.1:3000
echo.
echo 💡 提示: 在浏览器中打开上述地址即可使用应用
echo 💡 按 Ctrl+C 可停止服务器
echo.

call npm start
