// 现金流规划助手 - 本地服务器
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const extname = path.extname(filePath);
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log('======================================');
  console.log('  现金流规划助手 - 本地服务器已启动');
  console.log('======================================');
  console.log(`\n  访问地址: http://localhost:${PORT}`);
  console.log(`\n  首页:     http://localhost:${PORT}/index.html`);
  console.log(`  规划器:   http://localhost:${PORT}/planner.html`);
  console.log(`\n  按 Ctrl+C 停止服务器\n`);
});
