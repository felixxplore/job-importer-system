const { Queue } = require('bullmq');
const Ioredis = require('ioredis');

const connection = new Ioredis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null  // Fix: Disable retries for BullMQ compatibility
});
const importQueue = new Queue('jobImports', { connection });

module.exports = { importQueue, connection };