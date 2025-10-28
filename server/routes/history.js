const express = require('express');
const ImportLog = require('../models/ImportLog');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const logs = await ImportLog.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * parseInt(limit))
      .lean();
    const total = await ImportLog.countDocuments();
    res.json({ logs, total, pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;