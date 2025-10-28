const mongoose = require('mongoose');

const ImportLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  fileName: { type: String, required: true }, // API URL
  totalFetched: { type: Number, default: 0 },
  totalImported: { type: Number, default: 0 },
  newJobs: { type: Number, default: 0 },
  updatedJobs: { type: Number, default: 0 },
  failedJobs: { type: Number, default: 0 },
  failures: [{ reason: String, jobData: mongoose.Schema.Types.Mixed }],
}, { timestamps: true });

module.exports = mongoose.model('ImportLog', ImportLogSchema);