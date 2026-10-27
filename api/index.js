import { createApp } from '../server/dist/app.js';
import { connectDB } from '../server/dist/db/connection.js';

let app = null;

export default async function handler(req, res) {
  try {
    await connectDB();
    if (!app) {
      app = createApp();
    }
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Error]:', err);
    res.status(500).json({ error: 'Server error processing request', details: err?.message });
  }
}

