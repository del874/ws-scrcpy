import { TrackerChangeSet } from '@dead50f7/adbkit/lib/TrackerChangeSet';
import { Device } from '../Device';
import { Service } from '../../services/Service';
import AdbKitClient from '@dead50f7/adbkit/lib/adb/client';
import { AdbExtended } from '../adb';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import Tracker from '@dead50f7/adbkit/lib/adb/tracker';
import Timeout = NodeJS.Timeout;
import { BaseControlCenter } from '../../services/BaseControlCenter';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import * as os from 'os';
import * as crypto from 'crypto';
import { DeviceState } from '../../../common/DeviceState';

/**
 * Google设备控制中心，负责管理ADB连接的Android设备
 * 继承自BaseControlCenter并实现Service接口
 */
export class ControlCenter extends BaseControlCenter<GoogDeviceDescriptor> implements Service {
    /** 错误后默认等待时间(毫秒) */
    private static readonly defaultWaitAfterError = 1000;
    private static instance?: ControlCenter;

    /** 是否已初始化标志 */
    private initialized = false;
    /** ADB客户端实例 */
    private client: AdbKitClient = AdbExtended.createClient();
    /** 设备跟踪器实例 */
    private tracker?: Tracker;
    /** 错误后等待时间(毫秒)，会指数增长 */
    private waitAfterError = 1000;
    /** 重启跟踪器的定时器ID */
    private restartTimeoutId?: Timeout;
    /** 设备UDID到Device实例的映射 */
    private deviceMap: Map<string, Device> = new Map();
    /** 设备UDID到描述符的映射 */
    private descriptors: Map<string, GoogDeviceDescriptor> = new Map();
    /** 控制中心唯一标识符 */
    private readonly id: string;

    /**
     * 私有构造函数，使用单例模式
     */
    protected constructor() {
        super();
        const idString = `goog|${os.hostname()}|${os.uptime()}`;
        this.id = crypto.createHash('md5').update(idString).digest('hex');
    }

    /**
     * 获取ControlCenter单例实例
     * @returns ControlCenter实例
     */
    public static getInstance(): ControlCenter {
        if (!this.instance) {
            this.instance = new ControlCenter();
        }
        return this.instance;
    }

    /**
     * 检查是否存在ControlCenter实例
     * @returns 是否存在实例
     */
    public static hasInstance(): boolean {
        return !!ControlCenter.instance;
    }

    /**
     * 重启设备跟踪器
     * 在跟踪器出错或结束时调用，会指数退避重试
     */
    private restartTracker = (): void => {
        if (this.restartTimeoutId) {
            return;
        }
        console.log(`Device tracker is down. Will try to restart in ${this.waitAfterError}ms`);
        this.restartTimeoutId = setTimeout(() => {
            this.stopTracker();
            this.waitAfterError *= 1.2;
            this.init();
        }, this.waitAfterError);
    };

    /**
     * 处理设备状态变更
     * @param changes 设备状态变更集合
     */
    private onChangeSet = (changes: TrackerChangeSet): void => {
        this.waitAfterError = ControlCenter.defaultWaitAfterError;
        if (changes.added.length) {
            for (const item of changes.added) {
                const { id, type } = item;
                this.handleConnected(id, type);
            }
        }
        if (changes.removed.length) {
            for (const item of changes.removed) {
                const { id } = item;
                this.handleConnected(id, DeviceState.DISCONNECTED);
            }
        }
        if (changes.changed.length) {
            for (const item of changes.changed) {
                const { id, type } = item;
                this.handleConnected(id, type);
            }
        }
    };

    /**
     * 处理设备更新事件
     * @param device 更新的设备
     */
    private onDeviceUpdate = (device: Device): void => {
        const { udid, descriptor } = device;
        this.descriptors.set(udid, descriptor);
        this.emit('device', descriptor);
    };

    /**
     * 处理设备连接状态变化
     * @param udid 设备UDID
     * @param state 设备状态
     */
    private handleConnected(udid: string, state: string): void {
        let device = this.deviceMap.get(udid);
        if (device) {
            device.setState(state);
        } else {
            device = new Device(udid, state);
            device.on('update', this.onDeviceUpdate);
            this.deviceMap.set(udid, device);
        }
    }

    /**
     * 初始化控制中心
     * 启动设备跟踪器并获取当前设备列表
     */
    public async init(): Promise<void> {
        if (this.initialized) {
            return;
        }
        this.tracker = await this.startTracker();
        const list = await this.client.listDevices();
        list.forEach((device) => {
            const { id, type } = device;
            this.handleConnected(id, type);
        });
        this.initialized = true;
    }

    /**
     * 启动设备跟踪器
     * @returns 设备跟踪器实例
     */
    private async startTracker(): Promise<Tracker> {
        if (this.tracker) {
            return this.tracker;
        }
        const tracker = await this.client.trackDevices();
        tracker.on('changeSet', this.onChangeSet);
        tracker.on('end', this.restartTracker);
        tracker.on('error', this.restartTracker);
        return tracker;
    }

    /**
     * 停止设备跟踪器
     */
    private stopTracker(): void {
        if (this.tracker) {
            this.tracker.off('changeSet', this.onChangeSet);
            this.tracker.off('end', this.restartTracker);
            this.tracker.off('error', this.restartTracker);
            this.tracker.end();
            this.tracker = undefined;
        }
        this.tracker = undefined;
        this.initialized = false;
    }

    /**
     * 获取所有设备描述符
     * @returns 设备描述符数组
     */
    public getDevices(): GoogDeviceDescriptor[] {
        return Array.from(this.descriptors.values());
    }

    /**
     * 根据UDID获取设备实例
     * @param udid 设备UDID
     * @returns 设备实例或undefined
     */
    public getDevice(udid: string): Device | undefined {
        return this.deviceMap.get(udid);
    }

    /**
     * 获取控制中心ID
     * @returns 控制中心ID
     */
    public getId(): string {
        return this.id;
    }

    /**
     * 获取控制中心名称
     * @returns 控制中心名称
     */
    public getName(): string {
        return `aDevice Tracker [${os.hostname()}]`;
    }

    /**
     * 启动控制中心
     * @returns Promise
     */
    public start(): Promise<void> {
        return this.init().catch((e) => {
            console.error(`Error: Failed to init "${this.getName()}". ${e.message}`);
        });
    }

    /**
     * 释放控制中心资源
     */
    public release(): void {
        this.stopTracker();
    }

    /**
     * 执行控制中心命令
     * @param command 控制中心命令
     * @throws 当命令类型不支持时抛出错误
     */
    public async runCommand(command: ControlCenterCommand): Promise<void> {
        const udid = command.getUdid();
        const device = this.getDevice(udid);
        if (!device) {
            console.error(`Device with udid:"${udid}" not found`);
            return;
        }
        const type = command.getType();
        switch (type) {
            case ControlCenterCommand.KILL_SERVER:
                await device.killServer(command.getPid());
                return;
            case ControlCenterCommand.START_SERVER:
                await device.startServer();
                return;
            case ControlCenterCommand.UPDATE_INTERFACES:
                await device.updateInterfaces();
                return;
            default:
                throw new Error(`Unsupported command: "${type}"`);
        }
    }
}
