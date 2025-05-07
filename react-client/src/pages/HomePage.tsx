import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildHashUrl } from '../utils/urlUtils';
import DeviceTracker from '../components/DeviceTracker';
import '../styles/HomePage.css';

interface Device {
  udid: string;
  state: string;
  'ro.product.manufacturer'?: string;
  'ro.product.model'?: string;
  'ro.build.version.release'?: string;
  'ro.build.version.sdk'?: string;
  pid?: string;
  interfaces?: string[];
}

interface Tool {
  id: string;
  name: string;
  action: string;
  requiresDevice: boolean;
}

const HomePage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // 可用工具列表
  const tools: Tool[] = [
    { id: 'stream', name: '设备流', action: 'stream_scrcpy', requiresDevice: true },
    { id: 'shell', name: 'ADB Shell', action: 'shell', requiresDevice: true },
    { id: 'devtools', name: '开发者工具', action: 'devtools', requiresDevice: false },
    { id: 'filelisting', name: '文件浏览', action: 'filelisting', requiresDevice: true },
  ];

  // 处理设备列表更新
  const handleDevicesUpdate = (updatedDevices: Device[]) => {
    setDevices(updatedDevices);
    setLoading(false);
  };
  
  // 设备追踪器会自动连接WebSocket并获取设备列表

  const handleDeviceAction = (device: Device, action: string) => {
    // 根据设备类型和操作构建URL
    const params: Record<string, string> = {
      action,
      udid: device.udid,
    };
    
    // 所有设备都使用相同的stream action
    
    // 使用当前URL作为基础，添加hash参数
    const url = buildHashUrl(window.location.href.split('#')[0], params);
    window.location.href = url;
  };

  const handleToolAction = (tool: Tool) => {
    if (!tool.requiresDevice) {
      // 直接导航到不需要设备的工具
      const params: Record<string, string> = {
        action: tool.action,
      };
      const url = buildHashUrl(window.location.href.split('#')[0], params);
      window.location.href = url;
    }
  };

  return (
    <div className="home-container">
      <h1>ws-scrcpy React客户端</h1>
      
      <div className="devices-section">
        <h2>设备列表</h2>
        {loading && !devices.length ? (
          <p>加载设备列表中...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : (
          <>
            {/* 集成DeviceTracker组件 */}
            <DeviceTracker onDevicesUpdate={handleDevicesUpdate} />
            
            {/* 设备操作按钮 */}
            {devices.length > 0 && (
              <div className="device-actions-container">
                <h3>可用操作</h3>
                <ul className="device-list">
                  {devices.map((device) => (
                    <li key={device.udid} className={`device-item ${device.state === 'device' ? 'online' : 'offline'}`}>
                      <div className="device-info">
                        <span className="device-name">
                          {device['ro.product.manufacturer'] || ''} {device['ro.product.model'] || '未知设备'}
                        </span>
                        <span className="device-id">{device.udid}</span>
                        <span className={`device-state ${device.state === 'device' ? 'online' : 'offline'}`}>
                          {device.state === 'device' ? '在线' : '离线'}
                        </span>
                      </div>
                      <div className="device-actions">
                        {tools
                          .filter((tool) => tool.requiresDevice)
                          .map((tool) => (
                            <button
                              key={tool.id}
                              onClick={() => handleDeviceAction(device, tool.action)}
                              disabled={device.state !== 'device'}
                            >
                              {tool.name}
                            </button>
                          ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="tools-section">
        <h2>可用工具</h2>
        <div className="tools-list">
          {tools
            .filter((tool) => !tool.requiresDevice)
            .map((tool) => (
              <button
                key={tool.id}
                className="tool-button"
                onClick={() => handleToolAction(tool)}
              >
                {tool.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;