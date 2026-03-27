// workers.js
// ZAKOXUN 云盘 - 修复 env 传递问题

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 静态页面路由
    if (path === '/' || path === '') {
      return serveIndexPage();
    }
    if (path === '/style.css') {
      return serveStyleCSS();
    }
    if (path === '/script.js') {
      return serveScriptJS();
    }

    // API 路由 - 获取文件列表
    if (path === '/api/list') {
      return listFiles(env);
    }

    // 文件上传 (PUT)
    if (request.method === 'PUT') {
      return uploadFile(request, env, path);
    }

    // 文件下载 (GET)
    if (request.method === 'GET') {
      return downloadFile(request, env, path);
    }

    // 文件删除 (DELETE)
    if (request.method === 'DELETE') {
      return deleteFile(env, path);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// 获取文件列表
async function listFiles(env) {
  try {
    // 检查 env.OSS 是否存在
    if (!env.OSS) {
      return new Response(JSON.stringify({ error: 'R2 存储桶未绑定' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const list = await env.OSS.list();
    const files = list.objects.map(obj => ({
      name: obj.key,
      size: obj.size,
      uploaded: obj.uploaded
    }));
    
    return new Response(JSON.stringify({ files }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 上传文件
async function uploadFile(request, env, path) {
  const key = path.slice(1);
  if (!key) {
    return new Response('Invalid file name', { status: 400 });
  }
  
  try {
    await env.OSS.put(key, request.body);
    return new Response('OK', { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}

// 下载文件
async function downloadFile(request, env, path) {
  const key = path.slice(1);
  if (!key) {
    return new Response('Not Found', { status: 404 });
  }
  
  const object = await env.OSS.get(key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }
  
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(key)}"`
    }
  });
}

// 删除文件
async function deleteFile(env, path) {
  const key = path.slice(1);
  if (!key) {
    return new Response('Invalid file name', { status: 400 });
  }
  
  await env.OSS.delete(key);
  return new Response('OK', { status: 200 });
}

// ==================== HTML ====================
function serveIndexPage() {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZAKOXUN 云盘</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">📦 ZAKOXUN 云盘</div>
            <div class="subtitle">高速存储 · 安全稳定</div>
        </div>
        
        <div class="toolbar">
            <button class="refresh-btn" onclick="loadFiles()">🔄 刷新</button>
            <label class="upload-btn" for="fileInput">📤 上传文件</label>
            <input type="file" id="fileInput" multiple>
        </div>
        
        <div id="fileListContainer">
            <div class="loading">加载中...</div>
        </div>
    </div>
    
    <div class="upload-area" onclick="document.getElementById('fileInput').click()">
        📤 点击上传
    </div>

    <script src="/script.js"></script>
</body>
</html>`;
  
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// ==================== CSS ====================
function serveStyleCSS() {
  const css = `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}
body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #f5f5f5;
    min-height: 100vh;
    padding: 20px;
}
.container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    overflow: hidden;
}
.header {
    background: #2c3e50;
    color: white;
    padding: 20px 25px;
}
.title {
    font-size: 24px;
    font-weight: 600;
}
.subtitle {
    font-size: 12px;
    opacity: 0.7;
    margin-top: 5px;
}
.toolbar {
    padding: 15px 25px;
    background: white;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    gap: 10px;
}
.upload-btn, .refresh-btn {
    background: #28a745;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}
.refresh-btn {
    background: #6c757d;
}
.upload-btn:hover {
    background: #218838;
}
.file-table {
    width: 100%;
    border-collapse: collapse;
}
.file-table th {
    text-align: left;
    padding: 12px 15px;
    background: #f8f9fa;
    border-bottom: 2px solid #e9ecef;
    font-weight: 600;
}
.file-table td {
    padding: 10px 15px;
    border-bottom: 1px solid #e9ecef;
}
.file-table tr:hover {
    background: #f8f9fa;
}
.file-icon {
    font-size: 20px;
    margin-right: 8px;
}
.file-name {
    color: #3498db;
    cursor: pointer;
}
.file-name:hover {
    text-decoration: underline;
}
.download-link {
    color: #28a745;
    cursor: pointer;
    margin-right: 10px;
}
.delete-link {
    color: #dc3545;
    cursor: pointer;
}
.size-col, .date-col {
    color: #6c757d;
    font-size: 12px;
}
.empty-row {
    text-align: center;
    padding: 50px;
    color: #6c757d;
}
.loading {
    text-align: center;
    padding: 50px;
    color: #6c757d;
}
.upload-area {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #2c3e50;
    color: white;
    padding: 10px 20px;
    border-radius: 50px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}
.upload-area:hover {
    background: #34495e;
}
input[type="file"] {
    display: none;
}
@media (max-width: 768px) {
    .file-table th:nth-child(3),
    .file-table td:nth-child(3),
    .file-table th:nth-child(4),
    .file-table td:nth-child(4) {
        display: none;
    }
}`;
  
  return new Response(css, {
    headers: { 'Content-Type': 'text/css; charset=utf-8' }
  });
}

// ==================== JavaScript ====================
function serveScriptJS() {
  const js = `async function loadFiles() {
    const container = document.getElementById('fileListContainer');
    container.innerHTML = '<div class="loading">加载中...</div>';
    
    try {
        const res = await fetch('/api/list');
        const data = await res.json();
        
        if (data.error) {
            container.innerHTML = '<div class="empty-row">⚠️ ' + data.error + '</div>';
            return;
        }
        
        if (!data.files || data.files.length === 0) {
            container.innerHTML = '<div class="empty-row">📁 暂无文件，点击上传按钮添加文件</div>';
            return;
        }
        
        let html = '<table class="file-table"><thead> <th>名称</th><th>大小</th><th>修改时间</th><th>操作</th> </thead><tbody>';
        
        for (const file of data.files) {
            const icon = getFileIcon(file.name);
            const size = formatSize(file.size);
            const date = new Date(file.uploaded).toLocaleString();
            
            html += \`
                <tr>
                    <td><span class="file-icon">\${icon}</span> <span class="file-name" onclick="downloadFile('\${encodeURIComponent(file.name)}')">\${escapeHtml(file.name)}</span></td>
                    <td class="size-col">\${size}</td>
                    <td class="date-col">\${date}</td>
                    <td><a class="download-link" onclick="downloadFile('\${encodeURIComponent(file.name)}')">下载</a> <a class="delete-link" onclick="deleteFile('\${encodeURIComponent(file.name)}')">删除</a></td>
                </tr>
            \`;
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (err) {
        console.error(err);
        container.innerHTML = '<div class="empty-row">⚠️ 加载失败，请刷新重试</div>';
    }
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️',
        'mp4': '🎬', 'mov': '🎬', 'avi': '🎬', 'mkv': '🎬',
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
        'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'tar': '🗜️',
        'pdf': '📄', 'doc': '📝', 'docx': '📝', 'xls': '📊', 'xlsx': '📊',
        'exe': '⚙️', 'msi': '⚙️', 'apk': '📱',
        'txt': '📃', 'md': '📃', 'json': '🔧'
    };
    return icons[ext] || '📎';
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function downloadFile(filename) {
    window.open('/' + filename, '_blank');
}

async function deleteFile(filename) {
    if (!confirm('确定要删除 ' + filename + ' 吗？')) return;
    const res = await fetch('/' + filename, { method: 'DELETE' });
    if (res.ok) {
        loadFiles();
    } else {
        alert('删除失败');
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const files = e.target.files;
    for (const file of files) {
        const res = await fetch('/' + encodeURIComponent(file.name), {
            method: 'PUT',
            body: file
        });
        if (res.ok) {
            alert('上传成功：' + file.name);
        } else {
            alert('上传失败：' + file.name);
        }
    }
    loadFiles();
    document.getElementById('fileInput').value = '';
});

loadFiles();`;
  
  return new Response(js, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
  });
}