const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  uniqueId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: false }, // Full HTML or cleaned text
  category: { type: String },
  jobType: { type: String },
  region: { type: String },
  company: { type: String },
  url: { type: String, required: true },
  postDate: { type: Date,default: Date.now },
  imageUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);