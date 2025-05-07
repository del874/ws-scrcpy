/**
 * 视频流服务
 * 用于处理设备视频流和控制功能
 */

import { WebSocketService, WebSocketMessage } from './WebSocketService';

export interface StreamOptions {
    udid: string;
    type: 'android' | 'ios_qvhack' | 'ios_mjpeg';
    playerType?: string;
    maxSize?: number;
    bitrate?: number;
    maxFps?: number;
    onStreamStart?: () => void;
    onStreamStop?: () => void;
    onVideoData?: (data: ArrayBuffer) => void;
    onError?: (error: Error) => void;
}

export interface ControlMessage {
    type: string;
    data: any;
}

export class StreamService {
    private wsService: WebSocketService | null = null;
    private controlWsService: WebSocketService | null = null;
    private options: StreamOptions;
    private baseUrl: string;
    private isStreaming: boolean = false;

    constructor(baseUrl: string, options: StreamOptions) {
        this.baseUrl = baseUrl;
        this.options = options;
    }

    /**
     * 开始视频流
     */
    public startStream(): void {
        if (this.isStreaming) {
            return;
        }

        // 构建视频流WebSocket URL
        const wsUrl = this.buildStreamUrl();

        // 初始化视频流WebSocket
        this.wsService = new WebSocketService(wsUrl, {
            onOpen: this.handleStreamOpen.bind(this),
            onMessage: this.handleStreamMessage.bind(this),
            onError: this.handleStreamError.bind(this),
            onClose: this.handleStreamClose.bind(this)
        });

        // 初始化控制WebSocket
        const controlWsUrl = this.buildControlUrl();
        this.controlWsService = new WebSocketService(controlWsUrl, {
            onOpen: this.handleControlOpen.bind(this),
            onError: this.handleControlError.bind(this),
            onClose: this.handleControlClose.bind(this)
        });

        // 连接WebSocket
        this.wsService.connect();
        this.controlWsService.connect();

        this.isStreaming = true;
    }

    /**
     * 停止视频流
     */
    public stopStream(): void {
        if (!this.isStreaming) {
            return;
        }

        if (this.wsService) {
            this.wsService.disconnect();
            this.wsService = null;
        }

        if (this.controlWsService) {
            this.controlWsService.disconnect();
            this.controlWsService = null;
        }

        this.isStreaming = false;

        if (this.options.onStreamStop) {
            this.options.onStreamStop();
        }
    }

    /**
     * 发送控制命令
     * @param type 控制类型
     * @param data 控制数据
     */
    public sendControl(type: string, data: any): boolean {
        if (this.controlWsService && this.controlWsService.isConnected()) {
            const message: ControlMessage = { type, data };
            return this.controlWsService.send('control', message);
        }
        return false;
    }

    /**
     * 发送触摸事件
     * @param action 触摸动作 (down, move, up)
     * @param x X坐标
     * @param y Y坐标
     * @param pointerId 触摸点ID
     */
    public sendTouchEvent(action: 'down' | 'move' | 'up', x: number, y: number, pointerId: number = 0): boolean {
        return this.sendControl('touch', { action, x, y, pointerId });
    }

    /**
     * 发送按键事件
     * @param keyCode 按键码
     * @param action 按键动作 (down, up)
     */
    public sendKeyEvent(keyCode: number, action: 'down' | 'up'): boolean {
        return this.sendControl('key', { keyCode, action });
    }

    /**
     * 发送文本输入
     * @param text 要输入的文本
     */
    public sendText(text: string): boolean {
        return this.sendControl('text', { text });
    }

    /**
     * 检查是否正在流式传输
     */
    public isActive(): boolean {
        return this.isStreaming;
    }

    /**
     * 构建视频流WebSocket URL
     */
    private buildStreamUrl(): string {
        const { udid, type, playerType, maxSize, bitrate, maxFps } = this.options;
        const wsBase = this.baseUrl.replace(/^http/, 'ws');
        let url = `${wsBase}/api/v1/ws/stream`;

        const params = new URLSearchParams();
        params.append('udid', udid);
        params.append('type', type);

        if (playerType) {
            params.append('player', playerType);
        }

        if (maxSize) {
            params.append('maxSize', maxSize.toString());
        }

        if (bitrate) {
            params.append('bitrate', bitrate.toString());
        }

        if (maxFps) {
            params.append('maxFps', maxFps.toString());
        }

        return `${url}?${params.toString()}`;
    }

    /**
     * 构建控制WebSocket URL
     */
    private buildControlUrl(): string {
        const { udid, type } = this.options;
        const wsBase = this.baseUrl.replace(/^http/, 'ws');
        let url = `${wsBase}/api/v1/ws/control`;

        const params = new URLSearchParams();
        params.append('udid', udid);
        params.append('type', type);

        return `${url}?${params.toString()}`;
    }

    /**
     * 处理视频流WebSocket打开事件
     */
    private handleStreamOpen(): void {
        console.log('视频流WebSocket连接已打开');
        if (this.options.onStreamStart) {
            this.options.onStreamStart();
        }
    }

    /**
     * 处理视频流WebSocket消息
     * @param message WebSocket消息
     */
    private handleStreamMessage(message: WebSocketMessage): void {
        // 对于二进制数据，直接传递给视频处理器
        if (message.type === 'video_data' && this.options.onVideoData) {
            this.options.onVideoData(message.data);
        }
    }

    /**
     * 处理视频流WebSocket错误
     * @param event WebSocket错误事件
     */
    private handleStreamError(event: Event): void {
        console.error('视频流WebSocket错误:', event);
        if (this.options.onError) {
            this.options.onError(new Error('视频流连接错误'));
        }
    }

    /**
     * 处理视频流WebSocket关闭事件
     * @param event WebSocket关闭事件
     */
    private handleStreamClose(event: CloseEvent): void {
        console.log('视频流WebSocket连接关闭:', event.code, event.reason);
        this.isStreaming = false;

        if (this.options.onStreamStop) {
            this.options.onStreamStop();
        }
    }

    /**
     * 处理控制WebSocket打开事件
     */
    private handleControlOpen(): void {
        console.log('控制WebSocket连接已打开');
    }

    /**
     * 处理控制WebSocket错误
     * @param event WebSocket错误事件
     */
    private handleControlError(event: Event): void {
        console.error('控制WebSocket错误:', event);
        if (this.options.onError) {
            this.options.onError(new Error('控制连接错误'));
        }
    }

    /**
     * 处理控制WebSocket关闭事件
     * @param event WebSocket关闭事件
     */
    private handleControlClose(event: CloseEvent): void {
        console.log('控制WebSocket连接关闭:', event.code, event.reason);
    }
}