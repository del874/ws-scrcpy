# 开发者工具

从安卓设备转发和代理 WebKit 调试套接字到您的浏览器

## 工作原理

### 服务器

1. 查找开发工具套接字：`adb shell 'grep -a devtools_remote /proc/net/unix'`
2. 对每个套接字请求`/json`和`/json/version`
3. 在响应中将 websocket 地址替换为我们的主机名
4. 合并所有数据并发送给客户端

### 客户端

尽管每个可调试页面明确指定了`devtoolsFrontendUrl`，但提供的开发工具前端版本可能无法在您的浏览器中工作。为确保您能够调试网页/webview，客户端创建了三个链接：

-   `inspect` - 这是远程浏览器在回应`/json`请求时提供的链接（只有 WebSocket 地址被更改）。当此链接指向开发工具的本地版本（与可调试浏览器捆绑）时，您将无法打开它，因为目前只实现了 WebSocket 转发。
-   `bundled` - 链接到与您的（基于 chromium 的）浏览器捆绑的开发工具版本，无需指定远程目标的修订版本或版本。您将在 Chromium 浏览器的`chrome://inspect`页面中获得相同的链接。
    例如：`devtools://devtools/bundled/inspector.html?ws=<WebSocketAddress>`
-   `remote` - 链接到捆绑的开发工具，但指定了远程目标的修订版本和版本。仅当`devtoolsFrontendUrl`中的原始链接包含修订版本时，此链接才可见。您将在 Chrome 浏览器的`chrome://inspect`页面中获得相同的链接。
    例如：`devtools://devtools/remote/serve_rev/@<Revision>/inspector.html?remoteVersion=<Version>&remoteFrontend=true&ws=<WebSocketAddress>`

**您无法通过点击或"在新标签页中打开链接"来打开最后两个链接。**

您必须复制链接并手动打开它。这是浏览器的限制。
