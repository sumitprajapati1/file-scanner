import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { upload, handleUploadError } from '../middlewares/upload.js';
import { File } from '../models/file.js';
import { enqueueFileForScanning, getQueueStats } from '../services/queueService.js';
// import { redisClient } from '../config/redis.js';

const router = express.Router();

// File upload endpoint
router.post('/upload', upload.single('file'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;

    // Calculate file hash for deduplication
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check for duplicate files using Redis (disabled for now)
    // const existingFileId = await redisClient.get(`file_hash:${hash}`);
    // if (existingFileId) {
    //   // File already exists, remove the uploaded duplicate
    //   fs.unlinkSync(filePath);
    //   
    //   const existingFile = await File.findById(existingFileId);
    //   if (existingFile) {
    //     return res.status(409).json({
    //       error: 'Duplicate file',
    //       message: 'This file has already been uploaded',
    //       existingFile: {
    //         id: existingFile._id,
    //         filename: existingFile.originalName,
    //         status: existingFile.status,
    //         result: existingFile.result,
    //         uploadedAt: existingFile.uploadedAt
    //       }
    //     });
    //   }
    // }

    // Create file record
    const fileRecord = new File({
      filename,
      originalName: originalname,
      path: filePath,
      size,
      mimetype,
      hash,
      status: 'pending'
    });

    await fileRecord.save();

    // Store hash in Redis for deduplication (disabled for now)
    // await redisClient.setEx(`file_hash:${hash}`, 86400, fileRecord._id.toString()); // 24 hour expiry

    // Enqueue for scanning
    await enqueueFileForScanning(fileRecord._id.toString());

    console.log(`File uploaded: ${originalname} (${size} bytes)`);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord._id,
        filename: fileRecord.originalName,
        size: fileRecord.size,
        mimetype: fileRecord.mimetype,
        status: fileRecord.status,
        uploadedAt: fileRecord.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Get all files with optional filtering and pagination
router.get('/files', async (req, res) => {
  try {
    const {
      status,
      result,
      page = 1,
      limit = 20,
      sortBy = 'uploadedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (result) filter.result = result;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const files = await File.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select('-hash -path'); // Exclude sensitive fields

    // Transform files to ensure proper ID mapping
    const transformedFiles = files.map(file => ({
      ...file.toObject(),
      id: file._id.toString()
    }));

    // Get total count for pagination
    const totalFiles = await File.countDocuments(filter);
    const totalPages = Math.ceil(totalFiles / Number(limit));

    // Get queue statistics
    const queueStats = await getQueueStats();

    res.json({
      files: transformedFiles,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalFiles,
        hasNextPage: Number(page) < totalPages,
        hasPrevPage: Number(page) > 1
      },
      queue: queueStats,
      filters: {
        status: status || null,
        result: result || null
      }
    });

  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      error: 'Failed to fetch files',
      message: error.message
    });
  }
});

// Get specific file details
router.get('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({
        error: 'Invalid file ID',
        message: 'The provided file ID is invalid'
      });
    }

    const file = await File.findById(id).select('-hash -path');
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Transform file to ensure proper ID mapping
    const transformedFile = {
      ...file.toObject(),
      id: file._id.toString()
    };

    res.json({ file: transformedFile });

  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({
      error: 'Failed to fetch file',
      message: error.message
    });
  }
});

// Delete file
router.delete('/files/:id', async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`Delete request received for file ID: "${id}" (type: ${typeof id})`);

    // Validate the ID parameter
    if (!id || id === 'undefined' || id === 'null') {
      console.error(`Invalid file ID received: "${id}"`);
      return res.status(400).json({
        error: 'Invalid file ID',
        message: 'The provided file ID is invalid'
      });
    }

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }

    // Delete physical file
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Remove from Redis cache (disabled for now)
    // try {
    //   await redisClient.del(`file_hash:${file.hash}`);
    // } catch (redisError) {
    //   console.error('Error removing from Redis:', redisError);
    // }

    // Delete from database
    await File.findByIdAndDelete(id);

    console.log(`File deleted: ${file.originalName}`);

    res.json({
      message: 'File deleted successfully',
      deletedFile: {
        id: file._id,
        filename: file.originalName
      }
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      File.countDocuments({ status: 'pending' }),
      File.countDocuments({ status: 'scanning' }),
      File.countDocuments({ status: 'scanned', result: 'clean' }),
      File.countDocuments({ status: 'scanned', result: 'infected' }),
      File.countDocuments(),
      getQueueStats()
    ]);

    const [pending, scanning, clean, infected, total, queueStats] = stats;

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await File.find({
      uploadedAt: { $gte: last24Hours }
    }).sort({ uploadedAt: -1 }).limit(10);

    res.json({
      summary: {
        total,
        pending,
        scanning,
        clean,
        infected,
        scanned: clean + infected
      },
      queue: queueStats,
      recentActivity: recentActivity.map(file => ({
        id: file._id,
        filename: file.originalName,
        status: file.status,
        result: file.result,
        uploadedAt: file.uploadedAt,
        scannedAt: file.scannedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      message: error.message
    });
  }
});

// Health check for files service
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await File.countDocuments();
    
    // Test Redis connection (disabled for now)
    // const redisTest = await redisClient.ping();
    
    // Test queue connection
    const queueTest = await getQueueStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'disconnected', // Redis is disabled
        queue: 'connected'
      },
      stats: {
        totalFiles: dbTest,
        queuedJobs: queueTest.messageCount
      }
    });

  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;