import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGameSession extends Document {
  sessionId: string;
  playerId: Types.ObjectId;
  serverStartTime: Date;
  status: 'active' | 'completed' | 'abandoned' | 'expired';
  roundNumber: number;
  gameVersion: string;
  expectedDurationSeconds: number;
  completedAt?: Date;
  resultMetadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    serverStartTime: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned', 'expired'],
      default: 'active',
      index: true
    },
    roundNumber: {
      type: Number,
      default: 1,
      min: 1
    },
    gameVersion: {
      type: String,
      default: '1.0.0'
    },
    expectedDurationSeconds: {
      type: Number,
      default: 60
    },
    completedAt: {
      type: Date
    },
    resultMetadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true
  }
);

GameSessionSchema.index({ playerId: 1, status: 1 });
GameSessionSchema.index({ serverStartTime: -1 });

export const GameSession = mongoose.model<IGameSession>('GameSession', GameSessionSchema);
