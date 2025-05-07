import React, { useEffect, useRef, useState } from 'react';
import { StreamService } from '../services/StreamService';

interface VideoPlayerProps {
  udid: string;
  type: 'android' | 'ios_qvhack' | 'ios_mjpeg';
  playerType: string;
  baseUrl: string;
  onError?: (error: Error) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  udid,
  type,
  playerType,
  baseUrl,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamServiceRef = useRef<StreamService | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初始化流服务
    const streamService = new StreamService(baseUrl, {
      udid,
      type,
      playerType,
      maxSize: 1080, // 默认最大尺寸
      bitrate: 8000000, // 默认比特率
      maxFps: 60, // 默认最大帧率
      onStreamStart: handleStreamStart,
      onStreamStop: handleStreamStop,
      onVideoData: handleVideoData,
      onError: handleStreamError
    });

    streamServiceRef.current = streamService;

    // 开始流
    streamService.startStream();

    // 清理函数
    return () => {
      if (streamServiceRef.current) {
        streamServiceRef.current.stopStream();
        streamServiceRef.current = null;
      }
    };
  }, [udid, type, playerType, baseUrl]);

  // 处理流开始
  const handleStreamStart = () => {
    setIsPlaying(true);
    setError(null);
  };

  // 处理流停止
  const handleStreamStop = () => {
    setIsPlaying(false);
  };

  // 处理视频数据
  const handleVideoData = (data: ArrayBuffer) => {
    // 根据不同的播放器类型处理视频数据
    switch (playerType) {
      case 'webcodecs':
        // WebCodecs播放器处理逻辑
        handleWebCodecsData(data);
        break;
      case 'mse':
        // MSE播放器处理逻辑
        handleMSEData(data);
        break;
      case 'mjpeg':
        // MJPEG播放器处理逻辑
        handleMJPEGData(data);
        break;
      default:
        console.warn('未支持的播放器类型:', playerType);
    }
  };

  // 处理WebCodecs数据
  const handleWebCodecsData = (data: ArrayBuffer) => {
    // 这里是WebCodecs播放器的实现
    // 实际实现需要使用WebCodecs API
    console.log('处理WebCodecs数据', data.byteLength);
  };

  // 处理MSE数据
  const handleMSEData = (data: ArrayBuffer) => {
    // 这里是MSE播放器的实现
    // 实际实现需要使用Media Source Extensions API
    console.log('处理MSE数据', data.byteLength);
  };

  // 处理MJPEG数据
  const handleMJPEGData = (data: ArrayBuffer) => {
    // 这里是MJPEG播放器的实现
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        // 将ArrayBuffer转换为Blob
        const blob = new Blob([data], { type: 'image/jpeg' });
        // 创建URL
        const url = URL.createObjectURL(blob);
        // 创建Image对象
        const img = new Image();
        img.onload = () => {
          // 绘制图像到Canvas
          ctx.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
          // 释放URL
          URL.revokeObjectURL(url);
        };
        img.src = url;
      }
    }
  };

  // 处理流错误
  const handleStreamError = (error: Error) => {
    console.error('流错误:', error);
    setError(error.message);
    setIsPlaying(false);
    
    if (onError) {
      onError(error);
    }
  };

  // 发送触摸事件
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!streamServiceRef.current || !isPlaying) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    
    streamServiceRef.current.sendTouchEvent('down', x, y, touch.identifier);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!streamServiceRef.current || !isPlaying) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    
    streamServiceRef.current.sendTouchEvent('move', x, y, touch.identifier);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!streamServiceRef.current || !isPlaying) return;
    
    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;
    
    streamServiceRef.current.sendTouchEvent('up', x, y, touch.identifier);
  };

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!streamServiceRef.current || !isPlaying) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    streamServiceRef.current.sendTouchEvent('down', x, y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!streamServiceRef.current || !isPlaying) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    streamServiceRef.current.sendTouchEvent('move', x, y);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!streamServiceRef.current || !isPlaying) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    streamServiceRef.current.sendTouchEvent('up', x, y);
  };

  return (
    <div className="video-player-container">
      {error && (
        <div className="error-message">
          <p>错误: {error}</p>
          <button 
            onClick={() => {
              if (streamServiceRef.current) {
                streamServiceRef.current.startStream();
              }
            }}
          >
            重试
          </button>
        </div>
      )}
      
      {playerType === 'mjpeg' ? (
        <canvas
          ref={canvasRef}
          className="video-canvas"
          width="1280"
          height="720"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      ) : (
        <video
          ref={videoRef}
          className="video-element"
          autoPlay
          playsInline
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      )}
      
      {!isPlaying && !error && (
        <div className="loading-indicator">
          <p>正在连接设备流...</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;