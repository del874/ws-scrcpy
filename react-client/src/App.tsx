import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { parseHashParams } from './utils/urlUtils';
import HomePage from './pages/HomePage';
import DeviceStreamPage from './pages/DeviceStreamPage';
import ShellClientPage from './pages/ShellClientPage';
import DevtoolsClientPage from './pages/DevtoolsClientPage';
import FileListingPage from './pages/FileListingPage';
import './styles/App.css';

const App: React.FC = () => {
  const location = useLocation();
  const hashParams = parseHashParams(location.hash);
  const action = hashParams.get('action');
  const udid = hashParams.get('udid');

  // 根据URL参数决定渲染哪个页面组件
  const renderRouteByAction = () => {
    if (action === 'stream_scrcpy' && udid) {
      return <Route path="*" element={<DeviceStreamPage type="android" />} />;
    }
    
    if (action === 'shell' && udid) {
      return <Route path="*" element={<ShellClientPage />} />;
    }
    
    if (action === 'devtools') {
      return <Route path="*" element={<DevtoolsClientPage />} />;
    }
    
    if (action === 'filelisting') {
      return <Route path="*" element={<FileListingPage />} />;
    }
    
    // 默认显示主页
    return <Route path="*" element={<HomePage />} />;
  };

  return (
    <div className="app-container">
      <Routes>
        {renderRouteByAction()}
      </Routes>
    </div>
  );
};

export default App;