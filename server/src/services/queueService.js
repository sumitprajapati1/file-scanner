import amqp from 'amqplib';

let connection;
let channel;

const QUEUE_NAME = 'file_scan_queue';

export const initializeQueue = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    
    await channel.assertQueue(QUEUE_NAME, {
      durable: true 
    });

    console.log('RabbitMQ connected and queue initialized');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    throw error;
  }
};

export const enqueueFileForScanning = async (fileId) => {
  try {
    if (!channel) {
      throw new Error('Queue not initialized');
    }

    const message = JSON.stringify({
      fileId,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });

    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
      persistent: true 
    });

    console.log(`File ${fileId} queued for scanning`);
  } catch (error) {
    console.error('Error enqueueing file:', error);
    throw error;
  }
};

export const getQueueStats = async () => {
  try {
    if (!channel) {
      throw new Error('Queue not initialized');
    }

    const queueInfo = await channel.checkQueue(QUEUE_NAME);
    return { messageCount: queueInfo.messageCount };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return { messageCount: 0 };
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing RabbitMQ connection...');
  if (channel) await channel.close();
  if (connection) await connection.close();
  console.log('RabbitMQ connection closed');
});

export { channel, connection };