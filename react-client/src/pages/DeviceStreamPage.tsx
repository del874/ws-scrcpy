import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { parseHashParams } from '../utils/urlUtils';
import '../styles/DeviceStreamPage.css';

interface DeviceStreamPageProps {
  type: 'android';
}

interface PlayerInfo {
  id: string;
  name: string;
}

const DeviceStreamPage: React.FC<DeviceStreamPageProps> = ({ type }) => {
  const location = useLocation();
  const hashParams = parseHashParams(location.hash);
  const udid = hashParams.get('udid');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerInfo[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 根据设备类型加载不同的播放器
    const loadPlayers = async () => {
      try {
        let players: PlayerInfo[] = [];
        
        // 加载Android设备支持的播放器
        players = [
          { id: 'webcodecs', name: 'WebCodecs Player' },
          { id: 'mse', name: 'MSE Player' },
          { id: 'tinyh264', name: 'TinyH264 Player' },
          { id: 'broadway', name: 'Broadway Player' },
        ];
        
        setAvailablePlayers(players);
        // 默认选择第一个播放器
        if (players.length > 0) {
          setSelectedPlayer(players[0].id);
        }
      } catch (err) {
        setError('加载播放器失败');
      }
    };

    loadPlayers();
  }, [type]);

  useEffect(() => {
    if (!udid || !selectedPlayer) return;

    // 初始化视频流连接
    const initStream = async () => {
      try {
        setLoading(true);
        setError(null);

        // 这里应该根据设备类型和选择的播放器初始化视频流
        // 在实际实现中，这里需要调用原始代码中的相应客户端类
        // 例如：StreamClientScrcpy, StreamClientQVHack, StreamClientMJPEG
        
        console.log(`初始化设备 ${udid} 的视频流，使用播放器 ${selectedPlayer}`);
        
        // 模拟加载过程
        setTimeout(() => {
          setLoading(false);
          // 在实际实现中，这里应该将视频元素添加到videoContainerRef中
        }, 1500);
      } catch (err) {
        setError('初始化视频流失败');
        setLoading(false);
      }
    };

    initStream();

    // 清理函数
    return () => {
      // 断开视频流连接
      console.log('断开视频流连接');
    };
  }, [udid, selectedPlayer, type]);

  const handlePlayerChange = (playerId: string) => {
    setSelectedPlayer(playerId);
  };

  return (
    <div className="device-stream-container">
      <div className="stream-header">
        <h2>Android 设备流 - {udid}</h2>
        <div className="player-selector">
          <label>选择播放器：</label>
          <select 
            value={selectedPlayer || ''} 
            onChange={(e) => handlePlayerChange(e.target.value)}
            disabled={loading}
          >
            {availablePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stream-content">
        {loading ? (
          <div className="loading-container">
            <p>正在加载视频流...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>重试</button>
          </div>
        ) : (
          <div className="video-container" ref={videoContainerRef}>
            {/* 视频元素将在初始化时动态添加到这里 */}
            <div className="placeholder-message">
              <p>视频流将在这里显示</p>
              <p>在实际实现中，这里会显示设备屏幕</p>
            </div>
          </div>
        )}

        <div className="controls-container" ref={controlsRef}>
          {/* 控制按钮将在这里显示 */}
          <div className="control-buttons">
            <button className="control-button home">Home</button>
            <button className="control-button back">Back</button>
            <button className="control-button app-switch">App Switch</button>
            <button className="control-button power">Power</button>
            <button className="control-button volume-up">Vol+</button>
            <button className="control-button volume-down">Vol-</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceStreamPage;