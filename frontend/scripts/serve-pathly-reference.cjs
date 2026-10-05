const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const target = process.env.PATHLY_PREVIEW_URL || 'http://localhost:3001';
const port = Number(process.env.PATHLY_REFERENCE_PORT || 3002);
const reference = fs.readFileSync(path.resolve(__dirname, '../design-reference/pathly.html'), 'utf8');
const server = http.createServer(async (req, res) => {
  try {
    if (req.url.startsWith('/_next/')) {
      const response = await fetch(target + req.url);
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/octet-stream' });
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const response = await fetch(target);
    const current = await response.text();
    const styles = [...current.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)].map(match => match[0]);
    const offline = reference.replace(/<script src="https:\/\/cdn.tailwindcss.com"><\/script>/, '')
      .replace(/<script>\s*tailwind.config[\s\S]*?<\/script>/, '')
      .replace(/<link[^>]*(?:fonts.googleapis.com|fonts.gstatic.com|cdnjs.cloudflare.com)[^>]*>/g, '')
      .replace('</head>', styles.join('\n') + '</head>');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(offline);
  } catch (error) { res.writeHead(502); res.end('Local preview is not ready.'); }
});
server.listen(port, '127.0.0.1', () => console.log('Reference preview: http://localhost:' + port));
