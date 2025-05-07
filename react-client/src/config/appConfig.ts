/**
 * 应用配置
 * 用于管理不同环境下的配置参数
 */

interface AppConfig {
    apiBaseUrl: string;
    wsBaseUrl: string;
    defaultStreamOptions: {
        maxSize: number;
        bitrate: number;
        maxFps: number;
    };
    reconnectOptions: {
        maxAttempts: number;
        initialDelay: number;
        maxDelay: number;
    };
}

// 开发环境配置
const devConfig: AppConfig = {
    apiBaseUrl: 'http://localhost:8000',
    wsBaseUrl: 'ws://localhost:8000',
    defaultStreamOptions: {
        maxSize: 1080,
        bitrate: 8000000,
        maxFps: 60,
    },
    reconnectOptions: {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
    },
};

// 生产环境配置
const prodConfig: AppConfig = {
    apiBaseUrl: window.location.origin,
    wsBaseUrl: window.location.origin.replace(/^http/, 'ws'),
    defaultStreamOptions: {
        maxSize: 1080,
        bitrate: 8000000,
        maxFps: 60,
    },
    reconnectOptions: {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 20000,
    },
};

// 根据环境选择配置
const appConfig: AppConfig = process.env.NODE_ENV === 'production' ? prodConfig : devConfig;

export default appConfig;