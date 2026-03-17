/**
 * Script de prueba local para el Cloudflare Worker
 * Simula el comportamiento del worker sin necesidad de desplegarlo
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 8788;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400);
    res.end('Missing url parameter');
    return;
  }

  console.log(`[TEST] Proxying: ${targetUrl}`);

  const isPlaylist = targetUrl.includes('.m3u8');
  const protocol = targetUrl.startsWith('https') ? https : http;

  try {
    protocol.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://la14hd.com/',
        'Origin': 'https://la14hd.com'
      }
    }, (response) => {
      if (response.statusCode >= 400) {
        res.writeHead(response.statusCode);
        res.end(`Upstream error: ${response.statusCode}`);
        return;
      }

      if (isPlaylist) {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
          const rewritten = rewritePlaylist(data, targetUrl, `http://localhost:${PORT}`);
          res.writeHead(200, {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          });
          res.end(rewritten);
          console.log('[TEST] Playlist rewritten successfully');
        });
      } else {
        res.writeHead(200, {
          'Content-Type': response.headers['content-type'],
          'Access-Control-Allow-Origin': '*'
        });
        response.pipe(res);
      }
    }).on('error', (err) => {
      console.error('[TEST] Error:', err.message);
      res.writeHead(500);
      res.end(`Proxy error: ${err.message}`);
    });
  } catch (error) {
    res.writeHead(500);
    res.end(`Error: ${error.message}`);
  }
});

function rewritePlaylist(content, originalUrl, workerOrigin) {
  const urlObj = new URL(originalUrl);
  const baseUrl = originalUrl.substring(0, originalUrl.lastIndexOf('/') + 1);
  const queryParams = urlObj.search;

  const lines = content.split('\n');
  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      return line;
    }

    let segmentUrl = trimmed;
    if (!segmentUrl.startsWith('http')) {
      segmentUrl = new URL(segmentUrl, baseUrl).toString();
      if (!segmentUrl.includes('?') && queryParams) {
        segmentUrl += queryParams;
      }
    }

    return `${workerOrigin}?url=${encodeURIComponent(segmentUrl)}`;
  });

  return rewrittenLines.join('\n');
}

server.listen(PORT, () => {
  console.log(`\n🧪 Test Worker running on http://localhost:${PORT}`);
  console.log(`\nTest URL format:`);
  console.log(`http://localhost:${PORT}?url=https://example.com/playlist.m3u8\n`);
  console.log(`Press Ctrl+C to stop\n`);
});
