# ws-scrcpy React 客户端

这是使用 React 重写的 ws-scrcpy 前端界面，提供了更现代化的用户体验和组件化的代码结构。

## 功能特性

-   基于 React 和 TypeScript 构建的现代化前端
-   响应式设计，适配不同屏幕尺寸
-   组件化架构，便于维护和扩展
-   支持原有 ws-scrcpy 的所有功能：
    -   Android 设备屏幕镜像和控制
    -   iOS 设备屏幕镜像和控制
    -   ADB Shell 远程终端
    -   Chrome 开发者工具
    -   设备文件浏览

## 项目结构

```
react-client/
├── src/
│   ├── components/       # 可复用组件
│   ├── pages/            # 页面组件
│   │   ├── HomePage.tsx              # 主页，显示设备列表
│   │   ├── DeviceStreamPage.tsx      # 设备流页面
│   │   ├── ShellClientPage.tsx       # Shell终端页面
│   │   ├── DevtoolsClientPage.tsx    # 开发者工具页面
│   │   └── FileListingPage.tsx       # 文件浏览页面
│   ├── styles/           # CSS样式文件
│   ├── utils/            # 工具函数
│   ├── App.tsx           # 应用主组件
│   └── index.tsx         # 应用入口
├── index.html            # HTML入口文件
├── vite.config.ts        # Vite配置
└── package.json          # 项目依赖
```

## 开发指南

### 安装依赖

```bash
cd react-client
npm install
```

### 启动开发服务器

```bash
npm start
```

### 构建生产版本

```bash
npm run build
```

## 与原始代码的关系

这个 React 客户端是对原始 ws-scrcpy 前端代码的重写，保持了相同的功能，但使用了 React 组件化的方式进行实现。在实际部署时，可以：

1. 完全替换原有前端代码
2. 作为一个单独的客户端与原有客户端并行使用
3. 逐步迁移功能到 React 客户端

## 技术栈

-   React 18
-   TypeScript
-   React Router
-   Vite (构建工具)

## 注意事项

-   当前实现是基础框架，实际使用时需要将原有 ws-scrcpy 的核心功能类集成到 React 组件中
-   视频播放器、Shell 终端等功能需要与原有代码中的相应模块进行集成
