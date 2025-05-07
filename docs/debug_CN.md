### 客户端

1. 构建开发版本（将包含源映射）：

    > npm run dist:dev

2. 从`dist`目录运行：

    > npm run start

3. 使用浏览器内置的开发者工具或您喜欢的 IDE。

### Node.js 服务器

1. `npm run dist:dev`
2. `cd dist`
3. `node --inspect-brk ./index.js`

**提示**：您可能需要设置`DEBUG`环境变量（参见[debug](https://github.com/visionmedia/debug)）：

> DEBUG=\* node --inspect-brk ./index.js

### Android 服务器（`scrcpy-server.jar`）

源代码可在[此处](https://github.com/NetrisTV/scrcpy/tree/feature/websocket-server)获取
**提示**：您可能需要构建开发版本。

调试服务器：

1. 启动 node 服务器
2. 从 UI 中终止服务器（点击带有叉号和 PID 号的按钮）。
3. 上传服务器包到设备：

    > adb push server/build/outputs/apk/debug/server-debug.apk /data/local/tmp/scrcpy-server.jar

4. 设置端口转发：

    > adb forward tcp:5005 tcp:5005

5. 通过 adb shell 连接到设备：
    > adb shell

6.1. 对于 Android 8 及以下版本，在 adb shell 中运行以下命令（单行）：

> CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process -agentlib:jdwp=transport=dt_socket,suspend=y,server=y,address=5005 / com.genymobile.scrcpy.Server 1.17-ws5 DEBUG web 8886

6.2. 对于 Android 9 及以上版本：

> CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process -XjdwpProvider:internal -XjdwpOptions:transport=dt_socket,suspend=y,server=y,address=5005 / com.genymobile.scrcpy.Server 1.17-ws5 web DEBUG 8886

7. 在 Android Studio 中打开项目（scrcpy，而不是 ws-scrcpy），创建带有以下配置的`Remote`调试配置：
    > Host: localhost, Port: 5005

将调试器连接到设备上的远程服务器。
