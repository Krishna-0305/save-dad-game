import mongoose from 'mongoose';
import dns from 'dns';
import { config } from '../config/env.js';

// Resolve SRV lookup issues on Windows systems
if (process.platform === 'win32') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}

let mongodInstance: any = null;

export async function connectDB(): Promise<void> {
  // If already connected (or connecting) in serverless execution, reuse existing connection
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    // Attempt standard connection with 5 second timeout
    await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[Database] Connected to MongoDB at ${config.MONGODB_URI.replace(/\/\/.*@/, '//***@')}`);
  } catch (err: any) {
    console.warn(`[Database] External MongoDB connection failed (${err.message}). Attempting MongoMemoryServer...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create();
      const uri = mongodInstance.getUri();
      await mongoose.connect(uri);
      console.log(`[Database] Connected to MongoMemoryServer at ${uri}`);
    } catch (memErr: any) {
      console.warn('[Database] Notice: Standalone MongoDB server or internet connection for MongoMemoryServer was unavailable.');
    }
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch {}
}

