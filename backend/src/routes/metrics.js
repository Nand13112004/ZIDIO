const express = require('express');

const router = express.Router();
const startedAt = Date.now();

router.get('/', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  const lines = [
    '# HELP intellmeet_process_uptime_seconds Node.js process uptime in seconds.',
    '# TYPE intellmeet_process_uptime_seconds gauge',
    `intellmeet_process_uptime_seconds ${uptime.toFixed(3)}`,
    '# HELP intellmeet_process_started_at_milliseconds Process start time in Unix milliseconds.',
    '# TYPE intellmeet_process_started_at_milliseconds gauge',
    `intellmeet_process_started_at_milliseconds ${startedAt}`,
    '# HELP intellmeet_node_memory_heap_used_bytes Node.js heap memory used.',
    '# TYPE intellmeet_node_memory_heap_used_bytes gauge',
    `intellmeet_node_memory_heap_used_bytes ${memory.heapUsed}`,
    '# HELP intellmeet_node_memory_rss_bytes Resident set size memory.',
    '# TYPE intellmeet_node_memory_rss_bytes gauge',
    `intellmeet_node_memory_rss_bytes ${memory.rss}`,
  ];

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.status(200).send(`${lines.join('\n')}\n`);
});

module.exports = router;
