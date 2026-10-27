import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  accountStatus: 'active' | 'suspended';
  stats: {
    highScore: number;
    mostSaves: number;
    fastestRescueMs: number | null;
    totalSaves: number;
    bestCombo: number;
    totalRoundsPlayed: number;
    highestRound: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active'
    },
    stats: {
      highScore: { type: Number, default: 0, index: -1 },
      mostSaves: { type: Number, default: 0, index: -1 },
      fastestRescueMs: { type: Number, default: null, index: 1 },
      totalSaves: { type: Number, default: 0, index: -1 },
      bestCombo: { type: Number, default: 0, index: -1 },
      totalRoundsPlayed: { type: Number, default: 0 },
      highestRound: { type: Number, default: 1, index: -1 }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for leaderboard queries
UserSchema.index({ 'stats.highScore': -1, updatedAt: 1 });
UserSchema.index({ 'stats.mostSaves': -1, updatedAt: 1 });
UserSchema.index({ 'stats.totalSaves': -1, updatedAt: 1 });
UserSchema.index({ 'stats.fastestRescueMs': 1, updatedAt: 1 });
UserSchema.index({ 'stats.highestRound': -1, updatedAt: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
