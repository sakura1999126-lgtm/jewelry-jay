const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3006;

// Stripeの初期化（環境変数が設定されている場合のみ）
let stripe = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');
  } else {
    console.log('Stripe secret key not configured - checkout will not work');
  }
} catch (err) {
  console.error('Failed to initialize Stripe:', err.message);
}

// MIMEタイプのマッピング
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

/**
 * 動画ファイルを Range リクエスト対応で配信する。
 * iOS Safari は Range(206) に対応していないと動画を再生しないため、.mp4/.webm はここで配信する。
 */
function serveVideoWithRange(filePath, req, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'video/mp4';

  fs.stat(filePath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      return;
    }

    const size = stat.size;
    const isHead = (req.method || 'GET').toUpperCase() === 'HEAD';
    const range = req.headers.range;

    if (isHead) {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': size,
        'Accept-Ranges': 'bytes'
      });
      res.end();
      return;
    }

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      let start = 0;
      let end = size - 1;

      if (match) {
        if (match[1] !== '') start = parseInt(match[1], 10);
        if (match[2] !== '') end = parseInt(match[2], 10);
        if (match[1] === '' && match[2] !== '') {
          start = Math.max(0, size - parseInt(match[2], 10));
          end = size - 1;
        }
        start = Math.min(start, size - 1);
        end = Math.min(end, size - 1);
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': size,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

// 静的ファイルを配信する関数
function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  // ファイルの存在確認
  fs.access(filePath, fs.constants.F_OK, (accessErr) => {
    if (accessErr) {
      console.error(`File not found: ${filePath}`);
      // 動画ファイルの場合は詳細なログを出力
      if (['.mp4', '.webm', '.mov'].includes(ext)) {
        console.error(`Video file requested but not found. Check if file exists at: ${filePath}`);
      }
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      return;
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error(`Error reading file: ${filePath}`, err);
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`, 'utf-8');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
}

// APIエンドポイント: 商品一覧取得
function getProducts(req, res) {
  const filePath = path.join(__dirname, 'products.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read products' }), 'utf-8');
      return;
    }
    try {
      const parsed = JSON.parse(data);
      // 配列 or { products: [...] } の両方に対応
      const products = Array.isArray(parsed) ? parsed : (parsed.products || []);
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(products), 'utf-8');
    } catch (parseErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to parse products' }), 'utf-8');
    }
  });
}

// APIエンドポイント: 商品詳細取得
function getProductById(req, res, productId) {
  const filePath = path.join(__dirname, 'products.json');
  
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to read products' }), 'utf-8');
      return;
    }
    try {
      const parsed = JSON.parse(data);
      const products = Array.isArray(parsed) ? parsed : (parsed.products || []);
      const product = products.find(p => p.id === productId);
      
      if (product) {
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(product), 'utf-8');
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Product not found' }), 'utf-8');
      }
    } catch (parseErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to parse products' }), 'utf-8');
    }
  });
}

// APIエンドポイント: 決済セッション作成（Stripe）
function createCheckoutSession(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      const { lineItems, successUrl, cancelUrl } = JSON.parse(body || '{}');

      // バリデーション
      if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'lineItems is required and must be a non-empty array' }), 'utf-8');
        return;
      }

      if (!successUrl || !cancelUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'successUrl and cancelUrl are required' }), 'utf-8');
        return;
      }

      if (!stripe) {
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Stripe secret key not configured' }), 'utf-8');
        return;
      }

      // Stripe Checkout Sessionを作成
      const sessionParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        shipping_address_collection: { allowed_countries: ['JP'] },
        locale: 'ja'
        // customer_emailは未指定（Stripeが自動的に管理）
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify({ sessionId: session.id, url: session.url }), 'utf-8');
    } catch (err) {
      console.error('Checkout error:', err);
      const errorMessage = err.message || 'Internal server error';
      const errorType = err.type || 'StripeError';
      
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ 
        error: errorMessage,
        type: errorType,
        details: err.raw ? err.raw.message : undefined
      }), 'utf-8');
    }
  });
}

// サーバー作成
const server = http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  let pathname = decodeURIComponent(u.pathname);
  const method = req.method;

  // APIエンドポイントの処理
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/products' && method === 'GET') {
      getProducts(req, res);
    } else if (pathname.startsWith('/api/products/') && method === 'GET') {
      const productId = pathname.split('/api/products/')[1];
      getProductById(req, res, productId);
    } else if (pathname === '/api/checkout' && method === 'POST') {
      createCheckoutSession(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API endpoint not found' }), 'utf-8');
    }
    return;
  }

  // 静的ファイルの配信
  let filePath;
  
  // publicフォルダ内のリソース（画像、動画など）
  if (pathname.startsWith('/public/')) {
    // /public/を削除して相対パスに変換
    const relativePath = pathname.replace(/^\/public\//, '');
    filePath = path.join(__dirname, 'public', relativePath);
  } else if (pathname.startsWith('/videos/')) {
    // videosフォルダ内の動画（public/videos/から）
    const videoName = pathname.replace('/videos/', '');
    filePath = path.join(__dirname, 'public', 'videos', videoName);
  } else if (pathname.startsWith('/images/')) {
    // imagesフォルダ内の画像
    // pathnameから/images/を取り除いて、imagesフォルダのパスを構築
    const imageName = pathname.replace('/images/', '');
    filePath = path.join(__dirname, 'images', imageName);
  } else if (pathname === '/') {
    filePath = path.join(__dirname, 'index.html');
  } else {
    // HTMLファイル、CSS、JSなどのルートレベルのファイル
    // 先頭の/を削除して相対パスに変換
    const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    filePath = path.join(__dirname, relativePath);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (['.mp4', '.webm'].includes(ext)) {
    serveVideoWithRange(filePath, req, res);
    return;
  }
  serveStaticFile(filePath, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log('API Endpoints:');
  console.log(`  GET  /api/products - Get all products`);
  console.log(`  GET  /api/products/:id - Get product by ID`);
  console.log(`  POST /api/checkout - Create checkout session (Stripe ready)`);
});

