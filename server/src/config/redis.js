// import { createClient } from 'redis';
// import dotenv from 'dotenv';

// dotenv.config();

// // Parse Redis URL
// const redisUrl = new URL(process.env.REDIS_URL);

// // Create Redis client with TLS enabled
// const redisClient = createClient({
//   socket: {
//     host: redisUrl.hostname,
//     port: Number(redisUrl.port),
//     tls: true, // ✅ important for SSL
//   },
//   username: redisUrl.username,
//   password: redisUrl.password,
// });

// redisClient.on('error', (err) => {
//   console.error('❌ Redis Client Error:', err);
// });

// export const connectRedis = async () => {
//   try {
//     await redisClient.connect();
//     console.log('✅ Redis connected securely');
//   } catch (err) {
//     console.error('❌ Redis connection failed:', err);
//   }
// };

// export { redisClient };
