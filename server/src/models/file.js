import mongoose, { Schema } from 'mongoose';

const FileSchema = new Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'scanning', 'scanned'],
    default: 'pending',
    index: true
  },
  result: {
    type: String,
    enum: ['clean', 'infected'],
    default: null,
    index: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  scannedAt: {
    type: Date,
    default: null
  },
  scanDuration: {
    type: Number
  },
  threatDetails: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
FileSchema.index({ status: 1, uploadedAt: -1 });
FileSchema.index({ result: 1, scannedAt: -1 });

export const File = mongoose.model('File', FileSchema);  