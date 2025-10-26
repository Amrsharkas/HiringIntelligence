import Redis from 'ioredis';

// Create and export Redis connection
export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // Required by BullMQ
  lazyConnect: true,
  // Enable offline queue
  enableOfflineQueue: true,
  // Set connection timeout
  connectTimeout: 30000,
  // Set command timeout - Increased to handle long-running operations
  commandTimeout: 60000, // 60 seconds timeout
  // Enable ready check
  enableReadyCheck: false,
  // Set keep-alive to prevent connection drops
  keepAlive: 30000,
  // Set reconnect strategy
  retryStrategy: (times) => {
    // Exponential backoff strategy
    const delay = Math.min(times * 500, 20000); // Cap at 20 seconds
    return delay;
  },
});

// Handle Redis connection events
redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisConnection.on('close', () => {
  console.log('🔌 Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Export function to close Redis connection
export const closeRedisConnection = async () => {
  if (redisConnection.status === 'ready') {
    await redisConnection.quit();
  }
};