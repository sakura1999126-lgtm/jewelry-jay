// Vercel Serverless Function for Products API
// このファイルは /api/products として動作します

const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONSリクエストの処理
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GETのみ許可
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const filePath = path.join(process.cwd(), 'products.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);

    // products.json が { products: [...] } 形式の場合、配列を直接返す
    const products = Array.isArray(parsed) ? parsed : (parsed.products || []);

    res.status(200).json(products);
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({
      error: 'Failed to read products',
      message: error.message
    });
  }
};
