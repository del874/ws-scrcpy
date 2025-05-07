/**
 * WebSocket服务
 * 用于处理与后端的WebSocket通信
 */

export interface WebSocketMessage {
    type: string;
    data: any;
}

export interface WebSocketOptions {
    onOpen?: (event: Event) => void;
    onMessage?: (message: WebSocketMessage) => void;
    onError?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    protocols?: string | string[];
}

export class WebSocketService {
    private ws: WebSocket | null = null;
    private url: string;
    private options: WebSocketOptions;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: number | null = null;

    constructor(url: string, options: WebSocketOptions = {}) {
        this.url = url;
        this.options = options;
    }

    /**
     * 连接WebSocket服务器
     */
    public connect(): void {
        if (this.ws) {
            this.disconnect();
        }

        try {
            this.ws = new WebSocket(this.url, this.options.protocols);

            this.ws.onopen = (event: Event) => {
                this.reconnectAttempts = 0;
                if (this.options.onOpen) {
                    this.options.onOpen(event);
                }
            };

            this.ws.onmessage = (event: MessageEvent) => {
                if (this.options.onMessage) {
                    try {
                        const message = JSON.parse(event.data) as WebSocketMessage;
                        this.options.onMessage(message);
                    } catch (error) {
                        console.error('解析WebSocket消息失败:', error);
                    }
                }
            };

            this.ws.onerror = (event: Event) => {
                if (this.options.onError) {
                    this.options.onError(event);
                }
            };

            this.ws.onclose = (event: CloseEvent) => {
                if (this.options.onClose) {
                    this.options.onClose(event);
                }

                // 尝试重新连接
                this.attemptReconnect();
            };
        } catch (error) {
            console.error('WebSocket连接失败:', error);
            this.attemptReconnect();
        }
    }

    /**
     * 断开WebSocket连接
     */
    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * 发送消息到WebSocket服务器
     * @param type 消息类型
     * @param data 消息数据
     */
    public send(type: string, data: any): boolean {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = { type, data };
            this.ws.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    /**
     * 检查WebSocket连接状态
     */
    public isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * 尝试重新连接
     */
    private attemptReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            console.log(`尝试在${delay}ms后重新连接... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            this.reconnectTimeout = window.setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            console.error('达到最大重连次数，停止重连');
        }
    }
}