/**
 * products.jsonをR2にアップロードするスクリプト
 * 使い方: .env に R2_ACCESS_KEY_ID と R2_SECRET_ACCESS_KEY を書いて node scripts/upload-products-to-r2.js
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

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

async function uploadProductsJson() {
  const productsPath = path.join(rootDir, 'products.json');
  
  if (!fs.existsSync(productsPath)) {
    console.error('エラー: products.jsonが見つかりません');
    process.exit(1);
  }

  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
  
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: 'products.json',
    Body: JSON.stringify(productsData, null, 2),
    ContentType: 'application/json',
  }));
  
  console.log('✅ products.jsonをR2にアップロードしました');
}

uploadProductsJson().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
