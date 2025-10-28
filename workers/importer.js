const { Worker } = require('bullmq');
const Job = require('../models/Job');
const ImportLog = require('../models/ImportLog');
const { connection } = require('../queues/ImportQueue'); // Fixed: 'importQueue' (your original had 'ImportQueue'—case-sensitive?)

let io; // NEW: For real-time (set from index.js)

const setIO = (serverIo) => { io = serverIo; };

const worker = new Worker('jobImports', async (job) => {
  const { jobs, apiUrl, batchStart } = job.data;
  console.log(`Processing batch starting at ${batchStart} for ${apiUrl}`);

  let newJobs = 0, updatedJobs = 0, failedJobs = 0, failures = [];

  // Validate and prepare
  const validJobs = [];
  for (const jobData of jobs) {
    if (!jobData.title || !jobData.url || !jobData.description || !jobData.uniqueId) {
      failedJobs++;
      failures.push({ reason: 'Missing required fields (title/url/description)', jobData });
      continue;
    }
    if (!jobData.uniqueId) {
      failedJobs++;
      failures.push({ reason: 'Missing uniqueId', jobData });
      continue;
    }
    validJobs.push(jobData);
  }

  console.log(`Preparing ${validJobs.length} valid operations for batch (filtered ${jobs.length - validJobs.length} invalid)`);

  // Use individual upserts for better logging/debug (as in your code)
  for (const jobData of validJobs) {
    try {
      const existing = await Job.findOne({ uniqueId: jobData.uniqueId });
      const res = await Job.findOneAndUpdate(
        { uniqueId: jobData.uniqueId },
        { $set: { ...jobData, updatedAt: new Date() } },
        { upsert: true, new: true }
      );
      if (!existing) {
        newJobs++;
      } else {
        updatedJobs++;
      }
      // Optional: Log first for sample
      if (newJobs + updatedJobs === 1) {
        console.log('First job data:', {
          uniqueId: jobData.uniqueId,
          title: (typeof jobData.title === 'string' ? jobData.title.substring(0, 50) + '...' : jobData.title),
          url: jobData.url.substring(0, 50) + '...',
          descriptionLength: jobData.description.length
        });
      }
    } catch (err) {
      failedJobs++;
      failures.push({ reason: err.message, jobData });
      console.error(`Individual upsert failed for ${jobData.uniqueId}:`, err.message);
    }
  }

  const totalImported = newJobs + updatedJobs;
  const totalFetched = jobs.length;

  // Log to DB
  const log = new ImportLog({
    fileName: apiUrl,
    totalFetched,
    totalImported,
    newJobs,
    updatedJobs,
    failedJobs,
    failures,
  });
  await log.save();
  console.log(`Saved log ID: ${log._id}`);  // Confirm save

  // NEW: Real-time emit to connected clients (e.g., frontend)
  if (io) {
    io.emit('newLog', log.toObject()); // Lean JSON for emit
    console.log('Emitted newLog to clients');
  }

  console.log(`Batch complete: ${newJobs} new, ${updatedJobs} updated, ${failedJobs} failed`);
}, { 
  connection, 
  concurrency: parseInt(process.env.CONCURRENCY) || 5 
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed after retries:`, err.message);
  // Optional: Clean up stuck jobs
});

module.exports = { worker, setIO };