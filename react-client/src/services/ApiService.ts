/**
 * API服务
 * 用于处理与后端API的通信
 */

export interface ApiOptions {
    baseUrl: string;
    timeout?: number;
    headers?: Record<string, string>;
}

export class ApiService {
    private baseUrl: string;
    private defaultHeaders: Record<string, string>;
    private timeout: number;

    constructor(options: ApiOptions) {
        this.baseUrl = options.baseUrl;
        this.timeout = options.timeout || 30000; // 默认30秒超时
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...options.headers
        };
    }

    /**
     * 发送GET请求
     * @param endpoint API端点
     * @param params 查询参数
     * @param headers 自定义请求头
     */
    public async get<T>(endpoint: string, params?: Record<string, string>, headers?: Record<string, string>): Promise<T> {
        const url = this.buildUrl(endpoint, params);
        const response = await this.fetchWithTimeout(url, {
            method: 'GET',
            headers: this.mergeHeaders(headers),
        });
        return this.handleResponse<T>(response);
    }

    /**
     * 发送POST请求
     * @param endpoint API端点
     * @param data 请求体数据
     * @param headers 自定义请求头
     */
    public async post<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
        const url = this.buildUrl(endpoint);
        const response = await this.fetchWithTimeout(url, {
            method: 'POST',
            headers: this.mergeHeaders(headers),
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse<T>(response);
    }

    /**
     * 发送PUT请求
     * @param endpoint API端点
     * @param data 请求体数据
     * @param headers 自定义请求头
     */
    public async put<T>(endpoint: string, data?: any, headers?: Record<string, string>): Promise<T> {
        const url = this.buildUrl(endpoint);
        const response = await this.fetchWithTimeout(url, {
            method: 'PUT',
            headers: this.mergeHeaders(headers),
            body: data ? JSON.stringify(data) : undefined,
        });
        return this.handleResponse<T>(response);
    }

    /**
     * 发送DELETE请求
     * @param endpoint API端点
     * @param headers 自定义请求头
     */
    public async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
        const url = this.buildUrl(endpoint);
        const response = await this.fetchWithTimeout(url, {
            method: 'DELETE',
            headers: this.mergeHeaders(headers),
        });
        return this.handleResponse<T>(response);
    }

    /**
     * 构建完整URL
     * @param endpoint API端点
     * @param params 查询参数
     */
    private buildUrl(endpoint: string, params?: Record<string, string>): string {
        let url = `${this.baseUrl}${endpoint}`;

        if (params) {
            const queryParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, value);
                }
            });

            const queryString = queryParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        return url;
    }

    /**
     * 合并请求头
     * @param headers 自定义请求头
     */
    private mergeHeaders(headers?: Record<string, string>): Record<string, string> {
        return {
            ...this.defaultHeaders,
            ...headers,
        };
    }

    /**
     * 带超时的fetch请求
     * @param url 请求URL
     * @param options fetch选项
     */
    private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const { signal } = controller;

        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal,
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new Error(`请求超时: ${url}`);
            }
            throw error;
        }
    }

    /**
     * 处理响应
     * @param response fetch响应对象
     */
    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            let errorMessage = `API错误: ${response.status} ${response.statusText}`;

            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // 忽略解析错误
            }

            throw new Error(errorMessage);
        }

        // 检查内容类型
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            return await response.json() as T;
        } else {
            // 对于非JSON响应，返回文本
            const text = await response.text();
            return text as unknown as T;
        }
    }
}

// 创建默认API服务实例
const apiService = new ApiService({
    baseUrl: window.location.origin,
});

export default apiService;