/**
 * ws-scrcpy服务端入口文件
 * 主要功能：
 * 1. 初始化HTTP和WebSocket服务器
 * 2. 加载不同平台模块(Android/iOS)
 * 3. 注册中间件处理请求
 */
import '../../LICENSE';
import * as readline from 'readline';
import { Config } from './Config';
import { HttpServer } from './services/HttpServer';
import { WebSocketServer } from './services/WebSocketServer';
import { Service, ServiceClass } from './services/Service';
import { MwFactory } from './mw/Mw';
import { WebsocketProxy } from './mw/WebsocketProxy';
import { HostTracker } from './mw/HostTracker';
import { WebsocketMultiplexer } from './mw/WebsocketMultiplexer';

// 需要启动的基础服务列表
const servicesToStart: ServiceClass[] = [HttpServer, WebSocketServer];

// 接受WebSocket连接的中间件列表
const mwList: MwFactory[] = [WebsocketProxy, WebsocketMultiplexer];

// 接受Multiplexer连接的中间件列表
const mw2List: MwFactory[] = [HostTracker];

// 运行中的服务实例
const runningServices: Service[] = [];
// 平台模块加载的Promise列表
const loadPlatformModulesPromises: Promise<void>[] = [];

// 获取配置实例
const config = Config.getInstance();

/// #if INCLUDE_GOOG
async function loadGoogModules() {
    const { ControlCenter } = await import('./goog-device/services/ControlCenter');
    const { DeviceTracker } = await import('./goog-device/mw/DeviceTracker');
    const { WebsocketProxyOverAdb } = await import('./goog-device/mw/WebsocketProxyOverAdb');

    if (config.runLocalGoogTracker) {
        mw2List.push(DeviceTracker);
    }

    if (config.announceLocalGoogTracker) {
        HostTracker.registerLocalTracker(DeviceTracker);
    }

    servicesToStart.push(ControlCenter);

    /// #if INCLUDE_ADB_SHELL
    const { RemoteShell } = await import('./goog-device/mw/RemoteShell');
    mw2List.push(RemoteShell);
    /// #endif

    /// #if INCLUDE_DEV_TOOLS
    const { RemoteDevtools } = await import('./goog-device/mw/RemoteDevtools');
    mwList.push(RemoteDevtools);
    /// #endif

    /// #if INCLUDE_FILE_LISTING
    const { FileListing } = await import('./goog-device/mw/FileListing');
    mw2List.push(FileListing);
    /// #endif

    mwList.push(WebsocketProxyOverAdb);
}
loadPlatformModulesPromises.push(loadGoogModules());
/// #endif

/// #if INCLUDE_APPL
async function loadApplModules() {
    const { ControlCenter } = await import('./appl-device/services/ControlCenter');
    const { DeviceTracker } = await import('./appl-device/mw/DeviceTracker');
    const { WebDriverAgentProxy } = await import('./appl-device/mw/WebDriverAgentProxy');

    // Hack to reduce log-level of appium libs
    const { default: npmlog } = await import('npmlog');
    npmlog.level = 'warn';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any)._global_npmlog = npmlog;

    if (config.runLocalApplTracker) {
        mw2List.push(DeviceTracker);
    }

    if (config.announceLocalApplTracker) {
        HostTracker.registerLocalTracker(DeviceTracker);
    }

    servicesToStart.push(ControlCenter);

    /// #if USE_QVH_SERVER
    const { QVHStreamProxy } = await import('./appl-device/mw/QVHStreamProxy');
    mw2List.push(QVHStreamProxy);
    /// #endif
    mw2List.push(WebDriverAgentProxy);
}
loadPlatformModulesPromises.push(loadApplModules());
/// #endif

// 1. 首先加载所有平台模块
// 2. 然后启动所有基础服务
Promise.all(loadPlatformModulesPromises)
    .then(() => {
        return servicesToStart.map((serviceClass: ServiceClass) => {
            const service = serviceClass.getInstance();
            runningServices.push(service);
            return service.start();
        });
    })
    .then(() => {
        // 3. 注册WebSocket中间件
        const wsService = WebSocketServer.getInstance();
        mwList.forEach((mwFactory: MwFactory) => {
            wsService.registerMw(mwFactory);
        });

        // 4. 注册Multiplexer中间件
        mw2List.forEach((mwFactory: MwFactory) => {
            WebsocketMultiplexer.registerMw(mwFactory);
        });

        if (process.platform === 'win32') {
            readline
                .createInterface({
                    input: process.stdin,
                    output: process.stdout,
                })
                .on('SIGINT', exit);
        }

        process.on('SIGINT', exit);
        process.on('SIGTERM', exit);
    })
    .catch((error) => {
        console.error(error.message);
        exit('1');
    });

// 退出标志，防止重复调用
let interrupted = false;
/**
 * 优雅退出处理函数
 * @param signal 接收到的信号
 */
function exit(signal: string) {
    console.log(`\nReceived signal ${signal}`);
    if (interrupted) {
        console.log('Force exit');
        process.exit(0);
        return;
    }
    interrupted = true;
    // 依次释放所有服务
    runningServices.forEach((service: Service) => {
        const serviceName = service.getName();
        console.log(`Stopping ${serviceName} ...`);
        service.release();
    });
}
