import { createApp } from './app.js';
import { connectDB } from './db/connection.js';
import { config } from './config/env.js';

async function main() {
  await connectDB();
  const app = createApp();

  app.listen(config.PORT, () => {
    console.log(`[Server] SAVE DAD! backend listening on http://localhost:${config.PORT}`);
  });
}

main().catch((err) => {
  console.error('[Fatal] Server failed to start:', err);
  process.exit(1);
});

