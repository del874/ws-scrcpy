import React from 'react';
import { StreamService } from '../services/StreamService';
import '../styles/DeviceControls.css';

interface DeviceControlsProps {
  streamService: StreamService | null;
  deviceType: 'android' | 'ios_qvhack' | 'ios_mjpeg';
  isConnected: boolean;
}

const DeviceControls: React.FC<DeviceControlsProps> = ({
  streamService,
  deviceType,
  isConnected
}) => {
  // Android按键代码
  const KEYCODE_HOME = 3;
  const KEYCODE_BACK = 4;
  const KEYCODE_APP_SWITCH = 187;
  const KEYCODE_POWER = 26;
  const KEYCODE_VOLUME_UP = 24;
  const KEYCODE_VOLUME_DOWN = 25;

  // 发送按键事件
  const sendKeyEvent = (keyCode: number) => {
    if (!streamService || !isConnected) return;
    
    // 发送按下事件
    streamService.sendKeyEvent(keyCode, 'down');
    
    // 延迟后发送抬起事件
    setTimeout(() => {
      streamService.sendKeyEvent(keyCode, 'up');
    }, 100);
  };

  // 发送文本
  const sendText = () => {
    if (!streamService || !isConnected) return;
    
    const text = prompt('请输入要发送的文本:');
    if (text) {
      streamService.sendText(text);
    }
  };

  // 根据设备类型渲染不同的控制按钮
  const renderDeviceControls = () => {
    if (deviceType === 'android') {
      return (
        <div className="android-controls">
          <button 
            onClick={() => sendKeyEvent(KEYCODE_HOME)}
            disabled={!isConnected}
            title="主页"
          >
            <span className="material-icons">home</span>
          </button>
          <button 
            onClick={() => sendKeyEvent(KEYCODE_BACK)}
            disabled={!isConnected}
            title="返回"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <button 
            onClick={() => sendKeyEvent(KEYCODE_APP_SWITCH)}
            disabled={!isConnected}
            title="最近任务"
          >
            <span className="material-icons">apps</span>
          </button>
          <button 
            onClick={() => sendKeyEvent(KEYCODE_POWER)}
            disabled={!isConnected}
            title="电源"
          >
            <span className="material-icons">power_settings_new</span>
          </button>
          <button 
            onClick={() => sendKeyEvent(KEYCODE_VOLUME_UP)}
            disabled={!isConnected}
            title="音量+"
          >
            <span className="material-icons">volume_up</span>
          </button>
          <button 
            onClick={() => sendKeyEvent(KEYCODE_VOLUME_DOWN)}
            disabled={!isConnected}
            title="音量-"
          >
            <span className="material-icons">volume_down</span>
          </button>
          <button 
            onClick={sendText}
            disabled={!isConnected}
            title="发送文本"
          >
            <span className="material-icons">keyboard</span>
          </button>
        </div>
      );
    } else if (deviceType.startsWith('ios')) {
      return (
        <div className="ios-controls">
          <button 
            onClick={() => {
              if (streamService && isConnected) {
                streamService.sendControl('home', {});
              }
            }}
            disabled={!isConnected}
            title="主页"
          >
            <span className="material-icons">home</span>
          </button>
          <button 
            onClick={() => {
              if (streamService && isConnected) {
                streamService.sendControl('lock', {});
              }
            }}
            disabled={!isConnected}
            title="锁定"
          >
            <span className="material-icons">lock</span>
          </button>
          <button 
            onClick={sendText}
            disabled={!isConnected}
            title="发送文本"
          >
            <span className="material-icons">keyboard</span>
          </button>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="device-controls">
      {renderDeviceControls()}
      
      {!isConnected && (
        <div className="controls-disabled-message">
          <p>设备未连接，控制功能不可用</p>
        </div>
      )}
    </div>
  );
};

export default DeviceControls;