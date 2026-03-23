// Serves the portal and all game dist/ folders.
// Usage: node scripts/serve-portal.mjs
//
// Routes:
//   /                       -> portal/index.html
//   /portal/*               -> portal/*
//   /play/{game-slug}/      -> {game-slug}/dist/index.html
//   /play/{game-slug}/*     -> {game-slug}/dist/*
//   /*                      -> static files from workspace root

import { createServer } from 'http';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = process.cwd();
const PORT = parseInt(process.env.PORT || '8080', 10);

const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.mjs':   'application/javascript; charset=utf-8',
  '.json':  'application/json; charset=utf-8',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.gif':   'image/gif',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
  '.otf':   'font/otf',
  '.mp3':   'audio/mpeg',
  '.ogg':   'audio/ogg',
  '.wav':   'audio/wav',
  '.webp':  'image/webp',
  '.wasm':  'application/wasm',
  '.glb':   'model/gltf-binary',
  '.gltf':  'model/gltf+json',
};

const GAMES = [
  'hack-and-slash',
  'burger-brawl',
  'phantom-lock',
  'crystal-siege-rts',
  'iron-conquest',
  'couch-chaos',
  'climb-clash',
  'quad-clash',
];

function resolveFile(urlPath) {
  // Strip query string and hash
  const clean = urlPath.split('?')[0].split('#')[0];

  // Root -> portal
  if (clean === '/' || clean === '') {
    return join(ROOT, 'portal', 'index.html');
  }

  // /play/{slug}  or  /play/{slug}/  or  /play/{slug}/some/asset
  const playMatch = clean.match(/^\/play\/([^/]+)(\/.*)?$/);
  if (playMatch) {
    const slug = playMatch[1];
    const rest = playMatch[2] || '/';
    const subPath = rest === '/' || rest === '' ? 'index.html' : rest.replace(/^\//, '');
    return join(ROOT, slug, 'dist', subPath);
  }

  // Everything else: serve from ROOT
  return join(ROOT, clean);
}

const server = createServer((req, res) => {
  const filePath = resolveFile(req.url);

  // Security: don't serve outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isFile()) {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ========================================');
  console.log(`   GAME ARCADE PORTAL`);
  console.log('  ========================================');
  console.log(`   Portal:  http://localhost:${PORT}/`);
  console.log('');
  console.log('   Games:');
  GAMES.forEach(g => {
    const distExists = existsSync(join(ROOT, g, 'dist', 'index.html'));
    const status = distExists ? '\x1b[32m  ready\x1b[0m' : '\x1b[31m  no dist/\x1b[0m';
    console.log(`     http://localhost:${PORT}/play/${g}/${status}`);
  });
  console.log('');
  console.log('  ========================================');
  console.log('');
});
