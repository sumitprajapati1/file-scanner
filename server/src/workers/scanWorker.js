import amqp from 'amqplib';
import dotenv from 'dotenv';
import { connectDB } from '../config/database.js';
// import { connectRedis } from '../config/redis.js';
import { scanFile } from '../services/scannerService.js';

dotenv.config();

const QUEUE_NAME = 'file_scan_queue';
const MAX_RETRIES = 3;

class ScanWorker {
  connection = null;
  channel = null;
  isShuttingDown = false;

  async start() {
    try {
      console.log('🔄 Starting scan worker...');
      
      // Connect to databases
      await connectDB();
    //   await connectRedis();
      
      // Connect to RabbitMQ
      await this.connectToQueue();
      
      // Start consuming messages
      await this.startConsuming();
      
      console.log('✅ Scan worker started successfully');
      console.log('⏳ Waiting for scan jobs...');
      
    } catch (error) {
      console.error('❌ Failed to start scan worker:', error);
      process.exit(1);
    }
  }

  async connectToQueue() {
    const rabbitmqUrl = process.env.RABBITMQ_URL;
    
    this.connection = await amqp.connect(rabbitmqUrl);
    this.channel = await this.connection.createChannel();
    
    // Ensure queue exists
    await this.channel.assertQueue(QUEUE_NAME, {
      durable: true
    });
    
    // Set prefetch to 1 to ensure fair distribution of work
    await this.channel.prefetch(1);
    
    console.log('✅ Connected to RabbitMQ');
  }

  async startConsuming() {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

    await this.channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg || this.isShuttingDown) {
        return;
      }

      try {
        const jobData = JSON.parse(msg.content.toString());
        const { fileId, retryCount = 0 } = jobData;
        
        console.log(`📥 Processing scan job for file: ${fileId} (attempt ${retryCount + 1})`);
        
        // Process the scan
        await this.processScanJob(fileId);
        
        // Acknowledge successful processing
        this.channel?.ack(msg);
        console.log(`✅ Scan job completed for file: ${fileId}`);
        
      } catch (error) {
        console.error('❌ Error processing scan job:', error);
        
        // Handle retry logic
        await this.handleFailedJob(msg, error);
      }
    }, {
      noAck: false // Manual acknowledgment
    });
  }

  async processScanJob(fileId) {
    const startTime = Date.now();
    
    try {
      const scanResult = await scanFile(fileId);
      const processingTime = Date.now() - startTime;
      
      console.log(`🔍 Scan completed in ${processingTime}ms - Result: ${scanResult.isInfected ? 'INFECTED' : 'CLEAN'}`);
      
    } catch (error) {
      console.error(`Scan failed for file ${fileId}:`, error);
      throw error;
    }
  }

  async handleFailedJob(msg, error) {
    try {
      const jobData = JSON.parse(msg.content.toString());
      const { fileId, retryCount = 0 } = jobData;
      
      if (retryCount < MAX_RETRIES) {
        // Retry the job
        const retryJobData = {
          ...jobData,
          retryCount: retryCount + 1,
          lastError: error.message,
          retryAt: new Date().toISOString()
        };
        
        console.log(`Retrying scan job for file ${fileId} (attempt ${retryCount + 2}/${MAX_RETRIES + 1})`);
        
        // Requeue with delay
        setTimeout(() => {
          if (this.channel && !this.isShuttingDown) {
            this.channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(retryJobData)), {
              persistent: true
            });
          }
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
        
        this.channel?.ack(msg);
      } else {
        // Max retries reached, mark as failed
        console.error(`Max retries reached for file ${fileId}, marking as failed`);
        
        // Update file status in database to indicate scan failure
        // Note: We'll handle this in the scanFile function itself
        
        this.channel?.ack(msg);
      }
    } catch (parseError) {
      console.error('Error handling failed job:', parseError);
      this.channel?.nack(msg, false, false); // Don't requeue malformed messages
    }
  }

  async shutdown() {
    console.log('Shutting down scan worker...');
    this.isShuttingDown = true;
    
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('✅ Scan worker shut down gracefully');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
    
    process.exit(0);
  }
}

// Create and start worker
const worker = new ScanWorker();

// Graceful shutdown handlers
process.on('SIGINT', () => worker.shutdown());
process.on('SIGTERM', () => worker.shutdown());
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  worker.shutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  worker.shutdown();
});

// Start the worker
worker.start().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});