# ws scrcpy

[Genymobile/scrcpy][scrcpy]的 Web 客户端及更多功能。

## 要求

浏览器必须支持以下技术：

- WebSockets
- 媒体源扩展和 h264 解码
- WebWorkers
- WebAssembly

服务器：

- Node.js v10+
- node-gyp（[安装说明](https://github.com/nodejs/node-gyp#installation)）
- `adb`可执行文件必须在 PATH 环境变量中可用

设备：

- Android 5.0+（API 21+）
- 已启用[adb 调试](https://developer.android.com/studio/command-line/adb.html#Enabling)
- 在某些设备上，您还需要启用[额外选项](https://github.com/Genymobile/scrcpy/issues/70#issuecomment-373286323)以使用键盘和鼠标进行控制。

## 构建和启动

确保您已安装[node.js](https://nodejs.org/en/download/)、
[node-gyp](https://github.com/nodejs/node-gyp)和
[构建工具](https://github.com/nodejs/node-gyp#installation)

```shell
git clone https://github.com/NetrisTV/ws-scrcpy.git
cd ws-scrcpy

## 对于稳定版本，找到最新标签并切换到它：
# git tag -l
# git checkout vX.Y.Z

npm install
npm start
```

## 支持的功能

### Android 屏幕投射

使用 Genymobile/scrcpy 的修改 版本 来流式传输 H264 视频，然后由以下解码器之一进行解码：

##### Mse 播放器

基于 xevokk/h264-converter 。
HTML5 视频。 需要 媒体源 API 和 video/mp4; codecs="avc1.42E01E" 支持 。从设备接收 NALU 创建 mp4 容器，然后将其提供给 MediaSource 。理论上，它可以使用硬件加速。

##### Broadway 播放器

基于 mbebenita/Broadway 和 131/h264-live-player 。 软件视频解码器编译成 wasm 模块。
需要 WebAssembly 和最好有 WebGL 支持。

##### TinyH264 播放器

基于 udevbe/tinyh264 。 软件视频解码器编译成 wasm 模块。 mbebenita/Broadway 的略微更新版本。
需要 WebAssembly 、 WebWorkers 、 WebGL 支持。

##### WebCodecs 播放器

解码由浏览器内置（软件/硬件）媒体解码器完成。
需要 WebCodecs 支持。目前，仅在 Chromium 及其衍生产品中可用。

#### 远程控制

- 触摸事件（包括多点触控）
- 多点触控模拟：
    CTRL
    以屏幕中心为中心开始，
    SHIFT
  - CTRL
        以当前点为中心开始
- 鼠标滚轮和触控板垂直/水平滚动
- 捕获键盘事件
- 注入文本（仅 ASCII）
- 复制到/从设备剪贴板
- 设备"旋转"

##### 文件推送

    拖放 APK 文件将其推送到 /data/local/tmp 目录。您可以从包含的 xtermjs/xterm.js 终端模拟器手动安装它（见下文）。

##### 远程 Shell

    从浏览器中通过 adb shell 控制您的设备。
    调试网页/WebView
    /docs/Devtools.md
    文件列表

- 列出文件
- 通过拖放上传文件
- 下载文件

### iOS

实验性功能 ： 默认情况下不构建 （参见 自定义构建 ）

#### 屏幕投射

需要在 PATH 中可用的 ws-qvh 。

#### MJPEG 服务器

在构建配置文件中启用 USE_WDA_MJPEG_SERVER （参见 自定义构建 ）。

流式传输屏幕内容的替代方式。它不需要额外的软件如 ws-qvh ，但可能需要更多资源，因为每一帧都被编码为 jpeg 图像。
远程控制
我们使用 appium/WebDriverAgent 来控制设备。
功能限于：

- 简单触摸
- 滚动
- 主页按钮点击
    确保您已正确 设置 WebDriverAgent 。
    WebDriverAgent 项目位于 node_modules/appium-webdriveragent/ 下。

您可能需要在设备上启用 AssistiveTouch ： 设置/通用/辅助功能 。

## 自定义构建

您可以通过在 build.config.override.json 中覆盖 默认配置 来在构建前自定义项目：

- INCLUDE_APPL - 包含 iOS 设备跟踪和控制代码
- INCLUDE_GOOG - 包含 Android 设备跟踪和控制代码
- INCLUDE_ADB_SHELL - Android 设备的 远程 shell ( xtermjs/xterm.js , Tyriar/node-pty )
- INCLUDE_DEV_TOOLS - Android 设备上网页和 web 视图的 开发工具
- INCLUDE_FILE_LISTING - 极简 文件管理
- USE_BROADWAY - 包含 Broadway 播放器
- USE_H264_CONVERTER - 包含 Mse 播放器
- USE_TINY_H264 - 包含 TinyH264 播放器
- USE_WEBCODECS - 包含 WebCodecs 播放器
- USE_WDA_MJPEG_SERVER - 配置 WebDriverAgent 启动 MJPEG 服务器
- USE_QVH_SERVER - 包含对 ws-qvh 的支持
- SCRCPY_LISTENS_ON_ALL_INTERFACES - scrcpy-server.jar 中的 WebSocket 服务器将在所有可用接口上监听连接。当为 true 时，它允许直接从浏览器连接到设备。否则，连接必须通过 adb 建立。

## 运行配置

您可以在 WS_SCRCPY_CONFIG 环境变量中指定配置文件的路径。

如果您想要使用"/"以外的路径名，可以在 WS_SCRCPY_PATHNAME 环境变量中指定。

配置文件格式： Configuration.d.ts 。

配置文件示例： config.example.yaml 。

## 已知问题

- Android 模拟器上的服务器监听内部接口，从外部无法访问。从接口列表中选择 proxy over adb 。
- TinyH264Player 可能无法启动，尝试重新加载页面。
- MsePlayer 在质量统计中报告太多丢帧：需要进一步调查。
- 在 Safari 上文件上传不显示进度（它一次性工作）。

## 安全警告

请注意并牢记：

- 浏览器和 node.js 服务器之间没有加密（您可以 配置 HTTPS）。
- 浏览器和 Android 设备上的 WebSocket 服务器之间没有加密。
- 任何级别都没有授权。
- 带有集成 WebSocket 服务器的 scrcpy 修改版本在所有网络接口上监听连接（参见 自定义构建 ）。
- 最后一个客户端断开连接后，scrcpy 的修改版本将继续运行。

## 相关项目

- [Genymobile/scrcpy][scrcpy]
- [xevokk/h264-converter][xevokk/h264-converter]
- [131/h264-live-player][h264-live-player]
- [mbebenita/Broadway][broadway]
- [DeviceFarmer/adbkit][adbkit]
- [xtermjs/xterm.js][xterm.js]
- [udevbe/tinyh264][tinyh264]
- [danielpaulus/quicktime_video_hack][qvh]

## scrcpy websocket 分支

目前，WebSocket 协议支持已添加到 scrcpy v1.19

- [Prebuilt package](/vendor/Genymobile/scrcpy/scrcpy-server.jar)
- [Source code][fork]

[fork]: https://github.com/NetrisTV/scrcpy/tree/feature/websocket-v1.19.x
[scrcpy]: https://github.com/Genymobile/scrcpy
[xevokk/h264-converter]: https://github.com/xevokk/h264-converter
[h264-live-player]: https://github.com/131/h264-live-player
[broadway]: https://github.com/mbebenita/Broadway
[adbkit]: https://github.com/DeviceFarmer/adbkit
[xterm.js]: https://github.com/xtermjs/xterm.js
[tinyh264]: https://github.com/udevbe/tinyh264
[qvh]: https://github.com/danielpaulus/quicktime_video_hack
