import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { parseHashParams } from '../utils/urlUtils';
import '../styles/FileListingPage.css';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: Date;
}

const FileListingPage: React.FC = () => {
  const location = useLocation();
  const hashParams = parseHashParams(location.hash);
  const udid = hashParams.get('udid');
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{name: string; path: string}[]>([]);

  useEffect(() => {
    if (!udid) {
      setError('未指定设备ID');
      setLoading(false);
      return;
    }

    // 加载文件列表
    const loadFiles = async () => {
      try {
        setLoading(true);
        setError(null);

        // 这里应该调用文件列表API
        // 在实际实现中，这里需要调用原始代码中的FileListingClient类
        console.log(`加载设备 ${udid} 的文件列表，路径: ${currentPath}`);
        
        // 模拟加载过程
        setTimeout(() => {
          // 模拟文件列表数据
          const mockFiles: FileItem[] = [
            { name: 'Download', path: '/storage/emulated/0/Download', isDirectory: true },
            { name: 'DCIM', path: '/storage/emulated/0/DCIM', isDirectory: true },
            { name: 'Pictures', path: '/storage/emulated/0/Pictures', isDirectory: true },
            { name: 'Movies', path: '/storage/emulated/0/Movies', isDirectory: true },
            { name: 'config.txt', path: '/storage/emulated/0/config.txt', isDirectory: false, size: 1024 },
            { name: 'log.txt', path: '/storage/emulated/0/log.txt', isDirectory: false, size: 2048 },
          ];
          
          setFiles(mockFiles);
          setLoading(false);
          
          // 更新面包屑导航
          updateBreadcrumbs(currentPath);
        }, 1000);
      } catch (err) {
        setError('加载文件列表失败');
        setLoading(false);
      }
    };

    loadFiles();
  }, [udid, currentPath]);

  const updateBreadcrumbs = (path: string) => {
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ name: '根目录', path: '/' }];
    
    let currentPath = '';
    parts.forEach(part => {
      currentPath += '/' + part;
      crumbs.push({
        name: part,
        path: currentPath
      });
    });
    
    setBreadcrumbs(crumbs);
  };

  const navigateToDirectory = (path: string) => {
    setCurrentPath(path);
  };

  const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return '-';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className="file-listing-container">
      <div className="file-listing-header">
        <h2>文件浏览 - {udid || '未知设备'}</h2>
      </div>

      <div className="breadcrumbs">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <span className="separator">/</span>}
            <span 
              className="breadcrumb-item" 
              onClick={() => navigateToDirectory(crumb.path)}
            >
              {crumb.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="file-listing-content">
        {loading ? (
          <div className="loading-container">
            <p>正在加载文件列表...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>重试</button>
          </div>
        ) : files.length === 0 ? (
          <div className="empty-container">
            <p>此目录为空</p>
          </div>
        ) : (
          <table className="file-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>大小</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.path}>
                  <td>
                    {file.isDirectory ? (
                      <span 
                        className="directory-name"
                        onClick={() => navigateToDirectory(file.path)}
                      >
                        📁 {file.name}
                      </span>
                    ) : (
                      <span className="file-name">📄 {file.name}</span>
                    )}
                  </td>
                  <td>{file.isDirectory ? '目录' : '文件'}</td>
                  <td>{file.isDirectory ? '-' : formatFileSize(file.size)}</td>
                  <td>
                    {!file.isDirectory && (
                      <button className="download-button">下载</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FileListingPage;