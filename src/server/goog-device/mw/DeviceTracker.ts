import WS from 'ws';
import { Mw, RequestParameters } from '../../mw/Mw';
import { ControlCenterCommand } from '../../../common/ControlCenterCommand';
import { ControlCenter } from '../services/ControlCenter';
import { ACTION } from '../../../common/Action';
import GoogDeviceDescriptor from '../../../types/GoogDeviceDescriptor';
import { DeviceTrackerEvent } from '../../../types/DeviceTrackerEvent';
import { DeviceTrackerEventList } from '../../../types/DeviceTrackerEventList';
import { Multiplexer } from '../../../packages/multiplexer/Multiplexer';
import { ChannelCode } from '../../../common/ChannelCode';

/**
 * 设备跟踪器类，用于管理和跟踪Android设备状态
 * 通过WebSocket连接接收控制命令并发送设备状态更新
 */

export class DeviceTracker extends Mw {
    /** 日志标签 */
    public static readonly TAG = 'DeviceTracker';
    /** 设备类型 */
    public static readonly type = 'android';
    /** 控制中心实例 */
    private adt: ControlCenter = ControlCenter.getInstance();
    /** 跟踪器唯一ID */
    private readonly id: string;

    /**
     * 处理通道连接请求
     * @param ws 多路复用器实例
     * @param code 通道代码
     * @returns 如果通道代码匹配则返回DeviceTracker实例，否则返回undefined
     */
    public static processChannel(ws: Multiplexer, code: string): Mw | undefined {
        if (code !== ChannelCode.GTRC) {
            return;
        }
        return new DeviceTracker(ws);
    }

    /**
     * 处理WebSocket请求
     * @param ws WebSocket实例
     * @param params 请求参数
     * @returns 如果action匹配则返回DeviceTracker实例，否则返回undefined
     */
    public static processRequest(ws: WS, params: RequestParameters): DeviceTracker | undefined {
        if (params.action !== ACTION.GOOG_DEVICE_LIST) {
            return;
        }
        return new DeviceTracker(ws);
    }

    /**
     * 构造函数
     * @param ws WebSocket或多路复用器实例
     */
    constructor(ws: WS | Multiplexer) {
        super(ws);

        this.id = this.adt.getId();
        this.adt
            .init()
            .then(() => {
                // 注册设备状态变更监听器
                this.adt.on('device', this.sendDeviceMessage);
                // 发送初始设备列表
                this.buildAndSendMessage(this.adt.getDevices());
            })
            .catch((error: Error) => {
                console.error(`[${DeviceTracker.TAG}] Error: ${error.message}`);
            });
    }

    /**
     * 发送单个设备状态更新消息
     * @param device 设备描述符
     */
    private sendDeviceMessage = (device: GoogDeviceDescriptor): void => {
        const data: DeviceTrackerEvent<GoogDeviceDescriptor> = {
            device,
            id: this.id,
            name: this.adt.getName(),
        };
        this.sendMessage({
            id: -1,
            type: 'device',
            data,
        });
    };

    /**
     * 构建并发送设备列表消息
     * @param list 设备描述符数组
     */
    private buildAndSendMessage = (list: GoogDeviceDescriptor[]): void => {
        const data: DeviceTrackerEventList<GoogDeviceDescriptor> = {
            list,
            id: this.id,
            name: this.adt.getName(),
        };
        this.sendMessage({
            id: -1,
            type: 'devicelist',
            data,
        });
    };

    /**
     * 处理WebSocket消息
     * @param event WebSocket消息事件
     */
    protected onSocketMessage(event: WS.MessageEvent): void {
        let command: ControlCenterCommand;
        try {
            command = ControlCenterCommand.fromJSON(event.data.toString());
        } catch (error: any) {
            console.error(`[${DeviceTracker.TAG}], Received message: ${event.data}. Error: ${error?.message}`);
            return;
        }
        this.adt.runCommand(command).catch((e) => {
            console.error(`[${DeviceTracker.TAG}], Received message: ${event.data}. Error: ${e.message}`);
        });
    }

    /**
     * 释放资源
     */
    public release(): void {
        super.release();
        // 移除设备状态变更监听器
        this.adt.off('device', this.sendDeviceMessage);
    }
}
