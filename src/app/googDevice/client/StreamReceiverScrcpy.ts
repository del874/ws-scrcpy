import { StreamReceiver } from '../../client/StreamReceiver';
import { ParamsStreamScrcpy } from '../../../types/ParamsStreamScrcpy';
import { ACTION } from '../../../common/Action';
import Util from '../../Util';

/**
 * 用于接收scrcpy流数据的接收器类
 * 继承自StreamReceiver，专门处理scrcpy流参数
 */
export class StreamReceiverScrcpy extends StreamReceiver<ParamsStreamScrcpy> {
    /**
     * 解析URL查询参数为ParamsStreamScrcpy对象
     * @param params - URL查询参数
     * @returns 解析后的ParamsStreamScrcpy对象
     * @throws 如果action不是STREAM_SCRCPY则抛出错误
     */
    public static parseParameters(params: URLSearchParams): ParamsStreamScrcpy {
        const typedParams = super.parseParameters(params);
        const { action } = typedParams;
        if (action !== ACTION.STREAM_SCRCPY) {
            throw Error('Incorrect action');
        }
        return {
            ...typedParams,
            action,
            udid: Util.parseString(params, 'udid', true),
            ws: Util.parseString(params, 'ws', true),
            player: Util.parseString(params, 'player', true),
        };
    }

    /**
     * 构建直接WebSocket连接的URL
     * @returns 用于WebSocket连接的URL对象
     */

    protected buildDirectWebSocketUrl(): URL {
        return new URL((this.params as ParamsStreamScrcpy).ws);
    }
}
