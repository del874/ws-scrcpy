import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { parseHashParams } from '../utils/urlUtils';
import '../styles/ShellClientPage.css';

const ShellClientPage: React.FC = () => {
  const location = useLocation();
  const hashParams = parseHashParams(location.hash);
  const udid = hashParams.get('udid');
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!udid) {
      setError('未指定设备ID');
      setLoading(false);
      return;
    }

    // 初始化Shell连接
    const initShell = async () => {
      try {
        setLoading(true);
        setError(null);

        // 这里应该初始化Shell客户端
        // 在实际实现中，这里需要调用原始代码中的ShellClient类
        console.log(`初始化设备 ${udid} 的Shell连接`);
        
        // 模拟连接过程
        setTimeout(() => {
          setLoading(false);
          setConnected(true);
          // 在实际实现中，这里应该将终端元素添加到terminalRef中
        }, 1500);
      } catch (err) {
        setError('初始化Shell连接失败');
        setLoading(false);
      }
    };

    initShell();

    // 清理函数
    return () => {
      // 断开Shell连接
      console.log('断开Shell连接');
    };
  }, [udid]);

  return (
    <div className="shell-client-container">
      <div className="shell-header">
        <h2>ADB Shell - {udid}</h2>
      </div>

      <div className="shell-content">
        {loading ? (
          <div className="loading-container">
            <p>正在连接Shell...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>重试</button>
          </div>
        ) : (
          <div className="terminal-container" ref={terminalRef}>
            {/* 终端元素将在初始化时动态添加到这里 */}
            <div className="placeholder-message">
              <p>终端将在这里显示</p>
              <p>在实际实现中，这里会显示交互式Shell</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShellClientPage;