/**
 * R2: 旧商品画像を削除し、商品画像2 をアップロード。ロゴ・動画はそのまま。
 * 使い方: .env に R2_ACCESS_KEY_ID と R2_SECRET_ACCESS_KEY を書いて node scripts/upload-to-r2.js
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  });
}

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '6b5659759b32352c1271481b370a3e4d';
const BUCKET = process.env.R2_BUCKET || 'jewelry-jay';
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('エラー: R2_ACCESS_KEY_ID と R2_SECRET_ACCESS_KEY を設定してください。');
  process.exit(1);
}

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

// R2 から削除する旧商品画像のキー一覧
const OLD_PRODUCT_KEYS = [
  'products/1枚目　4mmテニスネックレス.JPG',
  'products/2枚目　１６インチ　１８インチ.JPG',
  'products/3枚目　2mm １６インチ　１８インチ.JPG',
  'products/4枚目.JPG',
  'products/5枚目　3mm １６インチ　１８インチ　２０インチ.JPG',
  'products/6枚目.jpg',
  'products/1枚目　4mm.JPG',
  'products/2枚目　７インチ　4mm 3mm.JPG',
  'products/3枚目　７インチ　3mm 4mm.JPG',
  'products/4枚目　７インチ　2mm 3mm.jpg',
  'products/1枚目　6.5mm.jpg',
  'products/2枚目　6.5mm.JPG',
  'products/3枚目　5mm.jpg',
  'products/4枚目　6.5mm.JPG',
];

// ロゴ・動画は従来どおり
const STATIC_FILES = [
  { local: 'images/IMG_7300.png', key: 'images/IMG_7300.png' },
  { local: 'images/wtj logo.png', key: 'images/wtj logo.png' },
  { local: 'videos/サイト用 PV.mp4', key: 'videos/サイト用 PV.mp4' },
];

function walkDir(dir, base = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === '.DS_Store') continue;
    const fullPath = path.join(dir, file);
    const rel = base ? base + '/' + file : file;
    if (fs.statSync(fullPath).isDirectory()) {
      results.push(...walkDir(fullPath, rel));
    } else {
      results.push({ fullPath, relative: rel.replace(/\\/g, '/') });
    }
  }
  return results;
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

async function run() {
  // 1) 旧商品画像を R2 から削除
  console.log('--- 旧商品画像を R2 から削除 ---');
  for (const key of OLD_PRODUCT_KEYS) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      console.log('削除:', key);
    } catch (e) {
      console.warn('削除スキップ（存在しない可能性）:', key, e.message);
    }
  }

  // 2) ロゴ・動画をアップロード
  console.log('--- ロゴ・動画アップロード ---');
  for (const f of STATIC_FILES) {
    const filePath = path.join(rootDir, f.local);
    if (!fs.existsSync(filePath)) {
      console.warn('スキップ（ファイルなし）:', f.local);
      continue;
    }
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: f.key,
      Body: fs.readFileSync(filePath),
      ContentType: getContentType(filePath),
    }));
    console.log('アップロード:', f.key);
  }

  // 3) 商品画像2 を再帰的にアップロード（key: products/カテゴリ/サイズ/ファイル名）
  const productImagesDir = path.join(rootDir, 'public', 'images', '商品画像2');
  const productFiles = walkDir(productImagesDir);
  console.log('--- 商品画像2 をアップロード ---');
  for (const { fullPath, relative } of productFiles) {
    const key = 'products/' + relative;
    const body = fs.readFileSync(fullPath);
    await client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: getContentType(fullPath),
    }));
    console.log('アップロード:', key);
  }

  // 4) products.json の画像URLを R2 用に差し替え
  const R2_BASE = 'https://pub-23a88b535b73423c909a3b841e3fde53.r2.dev/products/';
  const productsPath = path.join(rootDir, 'products.json');
  let productsJson = fs.readFileSync(productsPath, 'utf8');
  productsJson = productsJson.replace(
    /\/public\/images\/商品画像2\/([^"]+)/g,
    (_, p) => R2_BASE + encodeURIComponent(p)
  );
  fs.writeFileSync(productsPath, productsJson, 'utf8');
  console.log('products.json を R2 URL に更新しました。');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
