const axios = require('axios');
const cheerio = require('cheerio'); // For cleaning HTML
const { parseXmlToJson } = require('../utils/XmlParser');
const { importQueue } = require('../queues/ImportQueue');

const API_ENDPOINTS = [
  'https://jobicy.com/?feed=job_feed',
  'https://jobicy.com/?feed=job_feed&job_categories=smm&job_types=full-time',
  'https://jobicy.com/?feed=job_feed&job_categories=seller&job_types=full-time&search_region=france',
  'https://jobicy.com/?feed=job_feed&job_categories=design-multi-media',
  'https://jobicy.com/?feed=job_feed&job_categories=data-science',
  'https://jobicy.com/?feed=job_feed&job_categories=copywriting',
  'https://jobicy.com/?feed=job_feed&job_categories=business',
  'https://jobicy.com/?feed=job_feed&job_categories=management',
  'https://www.higheredjobs.com/rss/articleFeed.cfm'
];

const extractCategoryFromUrl = (apiUrl) => {
  const match = apiUrl.match(/job_categories=([^&]+)/);
  return match ? match[1].replace(/-/g, ' ') : 'general'; // e.g., 'design-multi-media' -> 'design multi media'
};

const cleanDescription = (htmlDesc) => {
  const $ = cheerio.load(htmlDesc);
  return $.text().trim().substring(0, 1000) + '...'; // Truncate for storage; full in original if needed
};

const fetchAndQueueJobs = async (apiUrl) => {
  try {
    console.log(`Fetching from ${apiUrl}...`);
    const { data: xml } = await axios.get(apiUrl, { timeout: 10000 });
    console.log(`Raw XML length: ${xml.length}`);
    const json = await parseXmlToJson(xml);
    console.log(`Parsed JSON channel items: ${json.rss?.channel?.item ? (Array.isArray(json.rss.channel.item) ? json.rss.channel.item.length : 1) : 0}`);
    const items = json.rss?.channel?.item || [];

    let jobs = items.map(item => {
      // Extract text safely: field?._ || field || ''
      const title = item.title?._ || item.title || '';
      const descEncoded = item['content:encoded']?._ || item['content:encoded'] || '';
      const desc = item.description?._ || item.description || descEncoded; // Fallback to encoded
      const uniqueId = (item.id?._ || item.id || '') || (item.guid?._ || item.guid || '') || `${title}-${Date.now()}`;
      if (!uniqueId) uniqueId = `fallback-${Date.now()}`;
      const category = extractCategoryFromUrl(apiUrl);
      const pubDateStr = item.pubDate?._ || item.pubDate || '';

      return {
        uniqueId: uniqueId.toString().substring(0, 100),
        title: title.toString().substring(0, 200), // Truncate long titles
        description: cleanDescription(desc), // Now gets string input
        category,
        jobType: item['job_listing:job_type']?._ || item['job_listing:job_type'] || '',
        region: item['job_listing:location']?._ || item['job_listing:location'] || '',
        company: item['job_listing:company']?._ || item['job_listing:company'] || '',
        url: (item.link?._ || item.link || '').toString(), // FIXED: Extract + toString
        postDate: new Date(pubDateStr || Date.now()),
        imageUrl: item['media:content']?.$?.url || '',
      };
    }).filter(job => job.title && job.url); // Now url is string

    const totalFetched = jobs.length;
    if (totalFetched === 0) {
      console.log(`No jobs from ${apiUrl}`);
      return;
    }

    // Batch and queue (set attempts:1 temp to avoid loops)
    const batchSize = parseInt(process.env.BATCH_SIZE) || 50;
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);
      await importQueue.add('processBatch', { jobs: batch, apiUrl, batchStart: i }, {
        attempts: 1, // TEMP: 1 to stop retries; change to 3 later
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 10,
        removeOnFail: 5,
      });
    }

    console.log(`Queued ${totalFetched} jobs from ${apiUrl}`);
  } catch (error) {
    console.error(`Fetch error for ${apiUrl}:`, error.message);
  }
};
module.exports = { fetchAndQueueJobs, API_ENDPOINTS };