import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRescueEvent {
  eventIndex: number;
  reactionTimeMs: number;
  pointsAwarded: number;
  comboAtRescue: number;
  timestampOffsetMs: number;
}

export interface IGameResult extends Document {
  playerId: Types.ObjectId;
  sessionId: string;
  roundNumber: number;
  score: number;
  successfulSaves: number;
  fastestRescueMs: number | null;
  survivalTimeSeconds: number;
  bestCombo: number;
  validationStatus: 'valid' | 'flagged' | 'rejected';
  validationReason?: string;
  failureReason?: string;
  events: IRescueEvent[];
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GameResultSchema = new Schema<IGameResult>(
  {
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    roundNumber: {
      type: Number,
      default: 1,
      min: 1,
      index: -1
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      index: -1
    },
    successfulSaves: {
      type: Number,
      required: true,
      min: 0,
      index: -1
    },
    fastestRescueMs: {
      type: Number,
      default: null,
      index: 1
    },
    survivalTimeSeconds: {
      type: Number,
      required: true,
      min: 0,
      max: 120
    },
    bestCombo: {
      type: Number,
      required: true,
      min: 0,
      default: 1
    },
    validationStatus: {
      type: String,
      enum: ['valid', 'flagged', 'rejected'],
      default: 'valid',
      index: true
    },
    validationReason: {
      type: String
    },
    failureReason: {
      type: String
    },
    events: [
      {
        eventIndex: { type: Number, required: true },
        reactionTimeMs: { type: Number, required: true },
        pointsAwarded: { type: Number, required: true },
        comboAtRescue: { type: Number, required: true },
        timestampOffsetMs: { type: Number, required: true }
      }
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
      index: -1
    }
  },
  {
    timestamps: true
  }
);

GameResultSchema.index({ validationStatus: 1, score: -1, submittedAt: 1 });
GameResultSchema.index({ validationStatus: 1, roundNumber: -1, submittedAt: 1 });
GameResultSchema.index({ validationStatus: 1, successfulSaves: -1, submittedAt: 1 });
GameResultSchema.index({ validationStatus: 1, fastestRescueMs: 1, submittedAt: 1 });

export const GameResult = mongoose.model<IGameResult>('GameResult', GameResultSchema);
