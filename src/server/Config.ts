import * as process from 'process';
import * as fs from 'fs';
import * as path from 'path';
import { Configuration, HostItem, ServerItem } from '../types/Configuration';
import { EnvName } from './EnvName';
import YAML from 'yaml';

const DEFAULT_PORT = 8000;

const YAML_RE = /^.+\.(yaml|yml)$/i;
const JSON_RE = /^.+\.(json|js)$/i;

/**
 * 配置管理类，负责加载和解析应用配置
 * 使用单例模式确保全局唯一配置实例
 */
export class Config {
    /** 单例实例 */
    private static instance?: Config;
    /**
     * 初始化配置，合并默认配置和用户配置
     * @param userConfig - 用户提供的配置对象
     * @returns 完整的配置对象
     */
    private static initConfig(userConfig: Configuration = {}): Required<Configuration> {
        let runGoogTracker = false;
        let announceGoogTracker = false;
        /// #if INCLUDE_GOOG
        runGoogTracker = true;
        announceGoogTracker = true;
        /// #endif

        let runApplTracker = false;
        let announceApplTracker = false;
        /// #if INCLUDE_APPL
        runApplTracker = true;
        announceApplTracker = true;
        /// #endif
        const server: ServerItem[] = [
            {
                secure: false,
                port: DEFAULT_PORT,
            },
        ];
        const defaultConfig: Required<Configuration> = {
            runGoogTracker,
            runApplTracker,
            announceGoogTracker,
            announceApplTracker,
            server,
            remoteHostList: [],
        };
        const merged = Object.assign({}, defaultConfig, userConfig);
        merged.server = merged.server.map((item) => this.parseServerItem(item));
        return merged;
    }
    /**
     * 解析服务器配置项
     * @param config - 服务器配置项
     * @returns 解析后的服务器配置项
     * @throws 如果安全服务器缺少选项或证书配置冲突
     */
    private static parseServerItem(config: Partial<ServerItem> = {}): ServerItem {
        const secure = config.secure || false;
        const port = config.port || (secure ? 443 : 80);
        const options = config.options;
        const redirectToSecure = config.redirectToSecure || false;
        if (secure && !options) {
            throw Error('Must provide "options" for secure server configuration');
        }
        if (options?.certPath) {
            if (options.cert) {
                throw Error(`Can't use "cert" and "certPath" together`);
            }
            options.cert = this.readFile(options.certPath);
        }
        if (options?.keyPath) {
            if (options.key) {
                throw Error(`Can't use "key" and "keyPath" together`);
            }
            options.key = this.readFile(options.keyPath);
        }
        const serverItem: ServerItem = {
            secure,
            port,
            redirectToSecure,
        };
        if (typeof options !== 'undefined') {
            serverItem.options = options;
        }
        if (typeof redirectToSecure === 'boolean') {
            serverItem.redirectToSecure = redirectToSecure;
        }
        return serverItem;
    }
    /**
     * 获取配置单例实例
     * @returns 配置实例
     * @throws 如果配置文件类型不支持
     */
    public static getInstance(): Config {
        if (!this.instance) {
            const configPath = process.env[EnvName.CONFIG_PATH];
            let userConfig: Configuration;
            if (!configPath) {
                userConfig = {};
            } else {
                if (configPath.match(YAML_RE)) {
                    userConfig = YAML.parse(this.readFile(configPath));
                } else if (configPath.match(JSON_RE)) {
                    userConfig = JSON.parse(this.readFile(configPath));
                } else {
                    throw Error(`Unknown file type: ${configPath}`);
                }
            }
            const fullConfig = this.initConfig(userConfig);
            this.instance = new Config(fullConfig);
        }
        return this.instance;
    }

    /**
     * 读取文件内容
     * @param pathString - 文件路径
     * @returns 文件内容
     * @throws 如果文件不存在
     */
    public static readFile(pathString: string): string {
        const isAbsolute = pathString.startsWith('/');
        const absolutePath = isAbsolute ? pathString : path.resolve(process.cwd(), pathString);
        if (!fs.existsSync(absolutePath)) {
            throw Error(`Can't find file "${absolutePath}"`);
        }
        return fs.readFileSync(absolutePath).toString();
    }

    /**
     * 构造函数
     * @param fullConfig - 完整的配置对象
     */
    constructor(private fullConfig: Required<Configuration>) { }

    /**
     * 获取远程主机列表
     * @returns 格式化后的主机列表
     */
    public getHostList(): HostItem[] {
        if (!this.fullConfig.remoteHostList || !this.fullConfig.remoteHostList.length) {
            return [];
        }
        const hostList: HostItem[] = [];
        this.fullConfig.remoteHostList.forEach((item) => {
            const { hostname, port, pathname, secure, useProxy } = item;
            if (Array.isArray(item.type)) {
                item.type.forEach((type) => {
                    hostList.push({
                        hostname,
                        port,
                        pathname,
                        secure,
                        useProxy,
                        type,
                    });
                });
            } else {
                hostList.push({ hostname, port, pathname, secure, useProxy, type: item.type });
            }
        });
        return hostList;
    }

    /**
     * 获取是否运行Google设备追踪器
     * @returns 布尔值表示状态
     */
    public get runLocalGoogTracker(): boolean {
        return this.fullConfig.runGoogTracker;
    }

    /**
     * 获取是否通告Google设备追踪器
     * @returns 布尔值表示状态
     */
    public get announceLocalGoogTracker(): boolean {
        return this.fullConfig.runGoogTracker;
    }

    /**
     * 获取是否运行Apple设备追踪器
     * @returns 布尔值表示状态
     */
    public get runLocalApplTracker(): boolean {
        return this.fullConfig.runApplTracker;
    }

    /**
     * 获取是否通告Apple设备追踪器
     * @returns 布尔值表示状态
     */
    public get announceLocalApplTracker(): boolean {
        return this.fullConfig.runApplTracker;
    }

    /**
     * 获取服务器配置列表
     * @returns 服务器配置数组
     */
    public get servers(): ServerItem[] {
        return this.fullConfig.server;
    }
}
