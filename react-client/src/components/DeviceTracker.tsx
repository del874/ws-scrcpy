import React, { useEffect, useState, useCallback } from 'react';
import '../styles/DeviceTracker.css';

interface DeviceDescriptor {
  udid: string;
  state: string;
  'ro.product.manufacturer'?: string;
  'ro.product.model'?: string;
  'ro.build.version.release'?: string;
  'ro.build.version.sdk'?: string;
  pid?: string;
  interfaces?: string[];
}

interface DeviceTrackerEvent {
  id: string;
  name: string;
  device: DeviceDescriptor;
}

interface DeviceTrackerEventList {
  id: string;
  name: string;
  list: DeviceDescriptor[];
}

interface DeviceTrackerProps {
  onDevicesUpdate?: (devices: DeviceDescriptor[]) => void;
}

const DeviceTracker: React.FC<DeviceTrackerProps> = ({ onDevicesUpdate }) => {
  const [devices, setDevices] = useState<DeviceDescriptor[]>([]);
  const [trackerName, setTrackerName] = useState<string>('设备追踪器');
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 处理WebSocket消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'devicelist': {
          const data = message.data as DeviceTrackerEventList;
          setDevices(data.list);
          setTrackerName(data.name);
          onDevicesUpdate?.(data.list);
          break;
        }
        case 'device': {
          const data = message.data as DeviceTrackerEvent;
          setTrackerName(data.name);
          
          // 更新设备列表中的单个设备
          setDevices(prevDevices => {
            const updatedDevices = [...prevDevices];
            const index = updatedDevices.findIndex(d => d.udid === data.device.udid);
            
            if (index !== -1) {
              updatedDevices[index] = data.device;
            } else {
              updatedDevices.push(data.device);
            }
            
            onDevicesUpdate?.(updatedDevices);
            return updatedDevices;
          });
          break;
        }
        default:
          console.log(`未知消息类型: ${message.type}`);
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error);
      setError('处理设备数据时出错');
    }
  }, [onDevicesUpdate]);

  // 连接到WebSocket服务器
  useEffect(() => {
    // 构建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port || (protocol === 'wss:' ? '443' : '80');
    const wsUrl = `${protocol}//${hostname}:${port}?action=goog_device_list`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket连接已建立');
      setConnected(true);
      setError(null);
    };
    
    ws.onmessage = handleMessage;
    
    ws.onerror = (event) => {
      console.error('WebSocket错误:', event);
      setError('连接设备追踪器时出错');
      setConnected(false);
    };
    
    ws.onclose = (event) => {
      console.log(`WebSocket连接已关闭: ${event.reason}`);
      setConnected(false);
      
      // 尝试重新连接
      setTimeout(() => {
        console.log('尝试重新连接...');
      }, 2000);
    };
    
    return () => {
      ws.close();
    };
  }, [handleMessage]);

  // 渲染设备列表
  return (
    <div className="device-tracker">
      <div className="tracker-header">
        <h2>{trackerName}</h2>
        <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '已连接' : '未连接'}
        </span>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="device-list">
        {devices.length === 0 ? (
          <div className="no-devices">没有可用设备</div>
        ) : (
          devices.map((device) => (
            <div key={device.udid} className={`device ${device.state === 'device' ? 'active' : 'not-active'}`}>
              <div className="device-header">
                <div className="device-name">
                  {device['ro.product.manufacturer'] || ''} {device['ro.product.model'] || '未知设备'}
                </div>
                <div className="device-serial">{device.udid}</div>
                <div className="device-version">
                  <div className="release-version">{device['ro.build.version.release'] || ''}</div>
                  <div className="sdk-version">{device['ro.build.version.sdk'] || ''}</div>
                </div>
                <div className="device-state" title={`状态: ${device.state}`}></div>
              </div>
              
              {device.interfaces && device.interfaces.length > 0 && (
                <div className="device-interfaces">
                  <span>网络接口: </span>
                  {device.interfaces.join(', ')}
                </div>
              )}
              
              {device.pid && (
                <div className="device-pid">
                  <span>服务PID: </span>
                  {device.pid}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeviceTracker;