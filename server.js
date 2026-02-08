const http = require('http');
const fs = require('fs');
const path = require('path');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const PORT = parseInt(process.env.PORT || 3006, 10);

// Coming Soonモードの設定
// 環境変数 COMING_SOON=false で無効化、それ以外は有効
const COMING_SOON = process.env.COMING_SOON !== 'false';

// ベースURLの設定（環境変数から取得、デフォルトはwest-tokyo-jewels.com）
const BASE_URL = process.env.BASE_URL || 'https://west-tokyo-jewels.com';

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

// Nodemailerの初期化（環境変数が設定されている場合のみ）
let transporter = null;
try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('Email transporter initialized successfully');
  } else {
    console.log('SMTP not configured - email sending will not work');
  }
} catch (err) {
  console.error('Failed to initialize email transporter:', err.message);
}

// R2クライアントの初期化（環境変数が設定されている場合のみ）
let r2Client = null;
const R2_BUCKET = process.env.R2_BUCKET || 'jewelry-jay';
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '6b5659759b32352c1271481b370a3e4d';
const PRODUCTS_JSON_KEY = 'products.json';

try {
  if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
    console.log('R2 client initialized successfully');
  } else {
    console.log('R2 not configured - products.json will be stored locally only');
  }
} catch (err) {
  console.error('Failed to initialize R2 client:', err.message);
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
async function getProducts(req, res) {
  const filePath = path.join(__dirname, 'products.json');
  
  try {
    let productsData;
    
    // R2から読み込みを試みる（設定されている場合）
    if (r2Client) {
      const r2Data = await loadProductsFromR2();
      if (r2Data) {
        productsData = r2Data;
        // ローカルファイルも更新（キャッシュとして）
        try {
          fs.writeFileSync(filePath, JSON.stringify(r2Data, null, 2), 'utf8');
        } catch (localErr) {
          // ローカル保存エラーは無視（R2があれば問題ない）
        }
      }
    }
    
    // R2から取得できなかった場合、ローカルファイルから読み込む
    if (!productsData) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        productsData = JSON.parse(data);
      } catch (readErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read products' }), 'utf-8');
        return;
      }
    }
    
    // 配列 or { products: [...] } の両方に対応
    const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(products), 'utf-8');
  } catch (parseErr) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to parse products' }), 'utf-8');
  }
}

// APIエンドポイント: Stripe Checkout Session取得（注文完了ページ用）
async function getCheckoutSession(req, res, sessionId) {
  if (!stripe) {
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: 'Stripe not configured' }), 'utf-8');
    return;
  }

  try {
    // Stripe Checkout Sessionを取得（line_itemsも含める）
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'line_items.data.price.product']
    });

    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(session), 'utf-8');
  } catch (err) {
    console.error('Checkout session retrieval error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ error: err.message || 'Failed to retrieve checkout session' }), 'utf-8');
  }
}

// sitemap.xmlを生成する関数
function generateSitemap(req, res) {
  // BASE_URLの末尾のスラッシュを削除して正規化
  const baseUrl = BASE_URL.replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/checkout.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/tokusho.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy.html</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

  res.writeHead(200, { 'Content-Type': 'application/xml' });
  res.end(sitemap, 'utf-8');
}

// APIエンドポイント: 商品詳細取得
async function getProductById(req, res, productId) {
  const filePath = path.join(__dirname, 'products.json');
  
  try {
    let productsData;
    
    // R2から読み込みを試みる（設定されている場合）
    if (r2Client) {
      const r2Data = await loadProductsFromR2();
      if (r2Data) {
        productsData = r2Data;
        // ローカルファイルも更新（キャッシュとして）
        try {
          fs.writeFileSync(filePath, JSON.stringify(r2Data, null, 2), 'utf8');
        } catch (localErr) {
          // ローカル保存エラーは無視（R2があれば問題ない）
        }
      }
    }
    
    // R2から取得できなかった場合、ローカルファイルから読み込む
    if (!productsData) {
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        productsData = JSON.parse(data);
      } catch (readErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to read products' }), 'utf-8');
        return;
      }
    }
    
    const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
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
      const { lineItems, cartItems, successUrl, cancelUrl } = JSON.parse(body || '{}');

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
      // successUrlとcancelUrlが相対パスの場合はBASE_URLを付与
      const finalSuccessUrl = successUrl.startsWith('http') ? successUrl : `${BASE_URL}${successUrl.startsWith('/') ? '' : '/'}${successUrl}`;
      const finalCancelUrl = cancelUrl.startsWith('http') ? cancelUrl : `${BASE_URL}${cancelUrl.startsWith('/') ? '' : '/'}${cancelUrl}`;
      
      const sessionParams = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        shipping_address_collection: { allowed_countries: ['JP'] },
        locale: 'ja',
        customer_creation: 'always', // 顧客を作成してメール送信を確実にする
        // Stripeが自動でメール送信（Stripeダッシュボードの設定に従う）
        metadata: {
          cartItems: JSON.stringify(cartItems || [])
        }
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

// Stripe Webhookエンドポイント: 決済成功時に在庫を減らす
function handleStripeWebhook(req, res) {
  console.log('🔔 Webhook受信開始');
  
  let body = '';
  const sig = req.headers['stripe-signature'];

  if (!sig) {
    console.error('❌ Webhook signature header missing');
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Missing stripe-signature header' }), 'utf-8');
    return;
  }

  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    if (!stripe) {
      console.error('❌ Stripe not configured');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Stripe not configured' }), 'utf-8');
      return;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured - webhook verification required');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Webhook secret not configured' }), 'utf-8');
      return;
    }

    let event;
    try {
      // 署名検証を厳密に行う
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      console.log('✅ Webhook署名検証成功');
      console.log(`📨 Webhook受信完了：[${event.type}]`);
    } catch (err) {
      console.error('❌ Webhook署名検証失敗:', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Webhook Error: ${err.message}` }), 'utf-8');
      return;
    }

    processWebhookEvent(event, res);
  });
}

// Webhookイベントを処理
async function processWebhookEvent(event, res) {
  try {
    // checkout.session.completed イベントを処理
    if (event.type === 'checkout.session.completed') {
      console.log(`🛒 checkout.session.completed イベント処理開始`);
      const session = event.data.object;
      const sessionId = session.id;
      const customerEmail = session.customer_details?.email || session.customer_email;
      
      console.log(`📋 Session ID: ${sessionId}`);
      console.log(`📧 Customer Email: ${customerEmail || '未設定'}`);
      
      // metadataからcartItemsを取得
      let cartItems = [];
      if (session.metadata?.cartItems) {
        try {
          cartItems = JSON.parse(session.metadata.cartItems);
          console.log(`🛍️ Cart Items: ${JSON.stringify(cartItems)}`);
        } catch (parseErr) {
          console.error('❌ CartItemsのパースエラー:', parseErr);
          cartItems = [];
        }
      } else {
        console.warn('⚠️ CartItems metadata not found');
      }

      // 在庫減算処理
      if (cartItems.length > 0) {
        console.log(`📦 在庫更新処理開始（${cartItems.length}件）`);
        try {
          await updateInventory(cartItems);
          console.log(`✅ 在庫更新完了: Session ${sessionId}`);
        } catch (inventoryErr) {
          console.error('❌ 在庫更新エラー:', inventoryErr);
          // エラーが発生してもメール送信は続行
        }
      } else {
        console.warn('⚠️ CartItemsが空のため在庫更新をスキップ');
      }

      // メール送信処理
      if (customerEmail && transporter) {
        console.log(`📧 メール送信処理開始: ${customerEmail}`);
        try {
          await sendOrderConfirmationEmail(customerEmail, session, cartItems);
          console.log(`✅ メール送信完了: ${customerEmail}`);
        } catch (emailErr) {
          console.error('❌ メール送信エラー:', emailErr);
          // メール送信エラーはWebhookの成功を妨げない
        }
      } else {
        if (!customerEmail) {
          console.warn('⚠️ Customer email not found - メール送信をスキップ');
        }
        if (!transporter) {
          console.warn('⚠️ Email transporter not configured - メール送信をスキップ');
        }
      }
    } else {
      console.log(`ℹ️ 未処理のイベントタイプ: ${event.type}`);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }), 'utf-8');
  } catch (err) {
    console.error('❌ Webhook処理エラー:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Webhook processing failed' }), 'utf-8');
  }
}

// 在庫を更新する関数
async function updateInventory(cartItems) {
  try {
    const productsPath = path.join(__dirname, 'products.json');
    
    // ファイルの読み込み（R2から読み込みを試みる）
    let productsData;
    
    // R2から読み込みを試みる（設定されている場合）
    if (r2Client) {
      const r2Data = await loadProductsFromR2();
      if (r2Data) {
        productsData = r2Data;
        // ローカルファイルも更新（キャッシュとして）
        try {
          fs.writeFileSync(productsPath, JSON.stringify(r2Data, null, 2), 'utf8');
        } catch (localErr) {
          // ローカル保存エラーは無視（R2があれば問題ない）
        }
      }
    }
    
    // R2から取得できなかった場合、ローカルファイルから読み込む
    if (!productsData) {
      try {
        const fileContent = fs.readFileSync(productsPath, 'utf8');
        productsData = JSON.parse(fileContent);
      } catch (readErr) {
        console.error('❌ products.json読み込みエラー:', readErr);
        throw new Error(`Failed to read products.json: ${readErr.message}`);
      }
    }
    
    // 各カートアイテムについて在庫を減らす
    const updateResults = [];
    for (const cartItem of cartItems) {
      const productId = cartItem.productId;
      const quantity = cartItem.quantity || 1;
      
      console.log(`📦 在庫更新対象：[商品ID: ${productId}] / [数量: ${quantity}]`);
      
      const product = productsData.products.find(p => p.id === productId);
      if (!product) {
        console.error(`❌ 商品が見つかりません: ${productId}`);
        updateResults.push({ productId, success: false, error: 'Product not found' });
        continue;
      }

      try {
        if (cartItem.sizeName) {
          // サイズ指定がある場合
          const size = product.sizes?.find(s => s.name === cartItem.sizeName);
          if (size) {
            const oldStock = size.stock || 0;
            size.stock = Math.max(0, oldStock - quantity);
            console.log(`✅ 在庫更新: ${product.name} ${cartItem.sizeName} - ${oldStock} → ${size.stock}`);
            updateResults.push({ productId, sizeName: cartItem.sizeName, success: true, oldStock, newStock: size.stock });
          } else {
            console.error(`❌ サイズが見つかりません: ${product.name} - ${cartItem.sizeName}`);
            updateResults.push({ productId, sizeName: cartItem.sizeName, success: false, error: 'Size not found' });
          }
        } else {
          // サイズ指定がない場合（ピアスなど）
          const oldStock = product.stock || 0;
          product.stock = Math.max(0, oldStock - quantity);
          
          // サイズがある場合は最初のサイズの在庫も更新
          if (product.sizes && product.sizes.length > 0) {
            const firstSize = product.sizes[0];
            const oldSizeStock = firstSize.stock || 0;
            firstSize.stock = Math.max(0, oldSizeStock - quantity);
            console.log(`✅ 在庫更新: ${product.name} (${firstSize.name}) - ${oldSizeStock} → ${firstSize.stock}`);
          }
          
          console.log(`✅ 在庫更新: ${product.name} - ${oldStock} → ${product.stock}`);
          updateResults.push({ productId, success: true, oldStock, newStock: product.stock });
        }

        // 商品全体の在庫数を再計算
        if (product.sizes && product.sizes.length > 0) {
          product.stock = product.sizes.reduce((sum, size) => sum + (size.stock || 0), 0);
        }
      } catch (updateErr) {
        console.error(`❌ 在庫更新エラー (${productId}):`, updateErr);
        updateResults.push({ productId, success: false, error: updateErr.message });
      }
    }

    // products.jsonをローカルに保存
    try {
      fs.writeFileSync(productsPath, JSON.stringify(productsData, null, 2), 'utf8');
      console.log('✅ products.json保存完了（ローカル）');
    } catch (writeErr) {
      console.error('❌ products.json保存エラー:', writeErr);
      throw new Error(`Failed to write products.json: ${writeErr.message}`);
    }
    
    // R2にも保存（設定されている場合）
    if (r2Client) {
      await saveProductsToR2(productsData);
    }
    
    // 更新結果をログに出力
    const successCount = updateResults.filter(r => r.success).length;
    const failCount = updateResults.filter(r => !r.success).length;
    console.log(`📊 在庫更新結果: 成功 ${successCount}件 / 失敗 ${failCount}件`);
    
    if (failCount > 0) {
      console.error('❌ 一部の在庫更新に失敗しました:', updateResults.filter(r => !r.success));
    }
    
    return updateResults;
  } catch (err) {
    console.error('❌ 在庫更新処理全体でエラー:', err);
    throw err;
  }
}

// 在庫をテンプレートからリセットする関数（管理用）
async function resetStockFromTemplate(req, res) {
  if (!r2Client) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'R2 not configured' }), 'utf-8');
    return;
  }

  try {
    const templateData = JSON.parse(fs.readFileSync(productsTemplatePath, 'utf8'));
    await saveProductsToR2(templateData);
    
    // ローカルファイルも更新
    fs.writeFileSync(productsPath, JSON.stringify(templateData, null, 2), 'utf8');
    
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ success: true, message: '在庫をテンプレートからリセットしました' }), 'utf-8');
    console.log('✅ 在庫をテンプレートからリセットしました');
  } catch (err) {
    console.error('❌ 在庫リセットエラー:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }), 'utf-8');
  }
}

// 注文確認メールを送信する関数
async function sendOrderConfirmationEmail(customerEmail, session, cartItems) {
  if (!transporter) {
    throw new Error('Email transporter not configured');
  }

  // 商品情報を取得（R2から読み込みを試みる）
  const productsPath = path.join(__dirname, 'products.json');
  let productsData;
  
  // R2から読み込みを試みる（設定されている場合）
  if (r2Client) {
    const r2Data = await loadProductsFromR2();
    if (r2Data) {
      productsData = r2Data;
    }
  }
  
  // R2から取得できなかった場合、ローカルファイルから読み込む
  if (!productsData) {
    try {
      const fileContent = fs.readFileSync(productsPath, 'utf8');
      productsData = JSON.parse(fileContent);
    } catch (err) {
      console.error('❌ 商品情報の読み込みエラー:', err);
      throw err;
    }
  }

  // 注文内容を整形
  const orderItems = cartItems.map(item => {
    const product = productsData.products.find(p => p.id === item.productId);
    const productName = product ? product.name : item.productId;
    const sizeInfo = item.sizeName ? ` (${item.sizeName})` : '';
    const price = product ? (item.sizeName ? 
      (product.sizes?.find(s => s.name === item.sizeName)?.price || product.price) : 
      product.price) : 0;
    return {
      name: `${productName}${sizeInfo}`,
      quantity: item.quantity || 1,
      price: price
    };
  });

  const totalAmount = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const orderDate = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  // メール本文を作成
  const orderItemsHtml = orderItems.map(item => 
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}点</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">¥${item.price.toLocaleString()}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">¥${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
  ).join('');

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Noto Sans JP', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #000; color: #ffd700; padding: 20px; text-align: center; }
        .content { background: #fff; padding: 30px; }
        .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WEST TOKYO JEWELS</h1>
        </div>
        <div class="content">
          <h2>ご注文ありがとうございます</h2>
          <p>この度は、WEST TOKYO JEWELSをご利用いただき、誠にありがとうございます。</p>
          <p>ご注文を承りましたので、ご確認ください。</p>
          
          <h3>注文情報</h3>
          <p><strong>注文日時:</strong> ${orderDate}</p>
          <p><strong>注文番号:</strong> ${session.id}</p>
          
          <h3>ご注文内容</h3>
          <table>
            <thead>
              <tr>
                <th>商品名</th>
                <th style="text-align: right;">数量</th>
                <th style="text-align: right;">単価</th>
                <th style="text-align: right;">小計</th>
              </tr>
            </thead>
            <tbody>
              ${orderItemsHtml}
            </tbody>
          </table>
          
          <div class="total">
            合計金額: ¥${totalAmount.toLocaleString()}
          </div>
          
          <p>商品の発送準備が整い次第、別途ご連絡いたします。</p>
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
        </div>
        <div class="footer">
          <p>WEST TOKYO JEWELS</p>
          <p>Email: westtokyojewels@gmail.com</p>
          <p>Website: ${BASE_URL}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"WEST TOKYO JEWELS" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: customerEmail,
    subject: '【WEST TOKYO JEWELS】ご注文ありがとうございます',
    html: emailHtml
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 メール送信成功: Message ID ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('❌ メール送信エラー:', err);
    throw err;
  }
}

// R2からproducts.jsonを読み込む関数
async function loadProductsFromR2() {
  if (!r2Client) return null;
  
  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: PRODUCTS_JSON_KEY,
    });
    const response = await r2Client.send(command);
    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString);
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      console.log('📦 R2にproducts.jsonが存在しません（初回起動）');
      return null;
    }
    console.error('❌ R2からproducts.json読み込みエラー:', err.message);
    return null;
  }
}

// R2にproducts.jsonを保存する関数
async function saveProductsToR2(productsData) {
  if (!r2Client) return false;
  
  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: PRODUCTS_JSON_KEY,
      Body: JSON.stringify(productsData, null, 2),
      ContentType: 'application/json',
    });
    await r2Client.send(command);
    console.log('✅ products.jsonをR2に保存しました');
    return true;
  } catch (err) {
    console.error('❌ R2へのproducts.json保存エラー:', err.message);
    return false;
  }
}

// products.jsonの初期化（R2から読み込み、なければテンプレートからコピー）
const productsPath = path.join(__dirname, 'products.json');
const productsTemplatePath = path.join(__dirname, 'products.json.template');

(async () => {
  try {
    // まずR2から読み込みを試みる
    if (r2Client) {
      const r2Data = await loadProductsFromR2();
      if (r2Data) {
        fs.writeFileSync(productsPath, JSON.stringify(r2Data, null, 2), 'utf8');
        console.log('✅ products.jsonをR2から復元しました');
        return;
      }
    }
    
    // R2にない場合、ローカルファイルを確認
    if (!fs.existsSync(productsPath)) {
      if (fs.existsSync(productsTemplatePath)) {
        fs.copyFileSync(productsTemplatePath, productsPath);
        console.log('✅ products.jsonをテンプレートから作成しました');
        
        // R2が設定されている場合は、テンプレートをR2にも保存
        if (r2Client) {
          const templateData = JSON.parse(fs.readFileSync(productsTemplatePath, 'utf8'));
          await saveProductsToR2(templateData);
        }
      } else {
        console.warn('⚠️ products.json.templateが見つかりません');
      }
    } else {
      console.log('✅ 既存のproducts.jsonを使用します');
    }
  } catch (initErr) {
    console.error('❌ products.json初期化エラー:', initErr.message);
  }
})();

// サーバー作成
const server = http.createServer((req, res) => {
  const u = new URL(req.url || '/', 'http://localhost');
  let pathname = decodeURIComponent(u.pathname);
  const method = req.method;

  // Coming Soonモード: APIエンドポイント以外はComing Soonページを表示
  if (COMING_SOON && !pathname.startsWith('/api/') && !pathname.startsWith('/public/') && !pathname.startsWith('/videos/') && !pathname.startsWith('/images/') && pathname !== '/coming-soon.html' && pathname !== '/sitemap.xml' && !pathname.endsWith('.css') && !pathname.endsWith('.js') && !pathname.endsWith('.json')) {
    const comingSoonPath = path.join(__dirname, 'coming-soon.html');
    serveStaticFile(comingSoonPath, res);
    return;
  }

  // sitemap.xmlの処理
  if (pathname === '/sitemap.xml' && method === 'GET') {
    generateSitemap(req, res);
    return;
  }

  // APIエンドポイントの処理
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/products' && method === 'GET') {
      getProducts(req, res).catch(err => {
        console.error('getProducts error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get products' }), 'utf-8');
      });
    } else if (pathname.startsWith('/api/products/') && method === 'GET') {
      const productId = pathname.split('/api/products/')[1];
      getProductById(req, res, productId).catch(err => {
        console.error('getProductById error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get product' }), 'utf-8');
      });
    } else if (pathname === '/api/checkout' && method === 'POST') {
      createCheckoutSession(req, res);
    } else if (pathname === '/api/checkout-session' && method === 'GET') {
      const u = new URL(req.url || '/', 'http://localhost');
      const sessionId = u.searchParams.get('session_id');
      if (sessionId) {
        getCheckoutSession(req, res, sessionId);
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'session_id parameter is required' }), 'utf-8');
      }
    } else if (pathname === '/api/webhook' && method === 'POST') {
      handleStripeWebhook(req, res);
    } else if (pathname === '/api/reset-stock' && method === 'POST') {
      // 在庫リセット用API（管理用）
      resetStockFromTemplate(req, res);
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
  } else if (pathname === '/favicon.ico') {
    // favicon.icoへのリクエストは、R2の画像にリダイレクト（404エラーを防ぐ）
    res.writeHead(302, {
      'Location': 'https://pub-23a88b535b73423c909a3b841e3fde53.r2.dev/images/IMG_7300.png'
    });
    res.end();
    return;
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
  if (COMING_SOON) {
    console.log('🔒 Coming Soon mode: ENABLED');
    console.log('   Set COMING_SOON=false to disable');
  } else {
    console.log('🔓 Coming Soon mode: DISABLED');
  }
  console.log('API Endpoints:');
  console.log(`  GET  /api/products - Get all products`);
  console.log(`  GET  /api/products/:id - Get product by ID`);
  console.log(`  POST /api/checkout - Create checkout session (Stripe ready)`);
  console.log(`  GET  /api/checkout-session?session_id=... - Get checkout session details`);
  console.log(`  POST /api/webhook - Stripe webhook (inventory management)`);
});

