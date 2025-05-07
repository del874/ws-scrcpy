/**
 * 设备服务
 * 用于管理设备连接和状态
 */

import { WebSocketService, WebSocketMessage } from './WebSocketService';

export interface Device {
    id: string;
    name: string;
    type: 'android' | 'ios';
    state: 'online' | 'offline';
    properties?: Record<string, string>;
}

export interface DeviceServiceOptions {
    onDeviceListUpdate?: (devices: Device[]) => void;
    onDeviceConnect?: (device: Device) => void;
    onDeviceDisconnect?: (deviceId: string) => void;
    onError?: (error: Error) => void;
}

export class DeviceService {
    private wsService: WebSocketService;
    private devices: Map<string, Device> = new Map();
    private options: DeviceServiceOptions;
    private baseUrl: string;

    constructor(baseUrl: string, options: DeviceServiceOptions = {}) {
        this.baseUrl = baseUrl;
        this.options = options;

        // 初始化WebSocket服务
        const wsUrl = `${baseUrl.replace(/^http/, 'ws')}/api/v1/ws/device`;
        this.wsService = new WebSocketService(wsUrl, {
            onOpen: this.handleWsOpen.bind(this),
            onMessage: this.handleWsMessage.bind(this),
            onError: this.handleWsError.bind(this),
            onClose: this.handleWsClose.bind(this)
        });
    }

    /**
     * 连接到设备服务
     */
    public connect(): void {
        this.wsService.connect();
    }

    /**
     * 断开设备服务连接
     */
    public disconnect(): void {
        this.wsService.disconnect();
    }

    /**
     * 获取所有设备列表
     */
    public getDevices(): Device[] {
        return Array.from(this.devices.values());
    }

    /**
     * 获取指定设备信息
     * @param deviceId 设备ID
     */
    public getDevice(deviceId: string): Device | undefined {
        return this.devices.get(deviceId);
    }

    /**
     * 连接到指定设备
     * @param deviceId 设备ID
     */
    public connectToDevice(deviceId: string): void {
        this.wsService.send('connect_device', { deviceId });
    }

    /**
     * 断开指定设备连接
     * @param deviceId 设备ID
     */
    public disconnectDevice(deviceId: string): void {
        this.wsService.send('disconnect_device', { deviceId });
    }

    /**
     * 请求设备列表更新
     */
    public requestDeviceList(): void {
        this.wsService.send('get_devices', {});
    }

    /**
     * 处理WebSocket连接打开事件
     */
    private handleWsOpen(): void {
        // 连接成功后请求设备列表
        this.requestDeviceList();
    }

    /**
     * 处理WebSocket消息
     * @param message WebSocket消息
     */
    private handleWsMessage(message: WebSocketMessage): void {
        switch (message.type) {
            case 'device_list':
                this.handleDeviceList(message.data.devices);
                break;
            case 'device_connected':
                this.handleDeviceConnected(message.data.device);
                break;
            case 'device_disconnected':
                this.handleDeviceDisconnected(message.data.deviceId);
                break;
            case 'error':
                this.handleError(new Error(message.data.message));
                break;
            default:
                console.warn('未知的WebSocket消息类型:', message.type);
        }
    }

    /**
     * 处理设备列表更新
     * @param deviceList 设备列表
     */
    private handleDeviceList(deviceList: Device[]): void {
        // 清空当前设备列表
        this.devices.clear();

        // 添加新设备
        deviceList.forEach(device => {
            this.devices.set(device.id, device);
        });

        // 触发设备列表更新回调
        if (this.options.onDeviceListUpdate) {
            this.options.onDeviceListUpdate(this.getDevices());
        }
    }

    /**
     * 处理设备连接事件
     * @param device 已连接的设备
     */
    private handleDeviceConnected(device: Device): void {
        this.devices.set(device.id, device);

        if (this.options.onDeviceConnect) {
            this.options.onDeviceConnect(device);
        }

        // 同时触发设备列表更新
        if (this.options.onDeviceListUpdate) {
            this.options.onDeviceListUpdate(this.getDevices());
        }
    }

    /**
     * 处理设备断开连接事件
     * @param deviceId 断开连接的设备ID
     */
    private handleDeviceDisconnected(deviceId: string): void {
        const device = this.devices.get(deviceId);
        this.devices.delete(deviceId);

        if (device && this.options.onDeviceDisconnect) {
            this.options.onDeviceDisconnect(deviceId);
        }

        // 同时触发设备列表更新
        if (this.options.onDeviceListUpdate) {
            this.options.onDeviceListUpdate(this.getDevices());
        }
    }

    /**
     * 处理WebSocket错误
     * @param event WebSocket错误事件
     */
    private handleWsError(event: Event): void {
        console.error('设备服务WebSocket错误:', event);
        if (this.options.onError) {
            this.options.onError(new Error('设备服务连接错误'));
        }
    }

    /**
     * 处理WebSocket关闭事件
     * @param event WebSocket关闭事件
     */
    private handleWsClose(event: CloseEvent): void {
        console.log('设备服务WebSocket连接关闭:', event.code, event.reason);
    }

    /**
     * 处理错误
     * @param error 错误对象
     */
    private handleError(error: Error): void {
        if (this.options.onError) {
            this.options.onError(error);
        }
    }
}