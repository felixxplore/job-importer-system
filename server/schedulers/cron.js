const cron = require('cron');
const { fetchAndQueueJobs, API_ENDPOINTS } = require('../services/fetcher');

const job = new cron.CronJob('0 * * * *', async () => { // Hourly
  console.log('Hourly job fetch started');
  await Promise.all(API_ENDPOINTS.map(fetchAndQueueJobs)); // Parallel for speed
}, null, true, 'UTC');

module.exports = job;