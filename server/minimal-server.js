#!/usr/bin/env node

/**
 * ULTRA-MINIMAL SERVER FOR RAILWAY DEBUGGING
 */

console.log('🚀 Starting ultra-minimal server...');
console.log(`Node version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`PORT: ${process.env.PORT || 3000}`);

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ULTRA-MINIMAL health check
app.get('/health', (req, res) => {
  console.log('🔍 Health check called');
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic test endpoint
app.get('/test', (req, res) => {
  console.log('🔍 Test called');
  res.status(200).send('OK');
});

// Properties endpoint with hardcoded data
app.get('/api/properties', (req, res) => {
  console.log('🔍 Properties called');
  res.status(200).json({
    properties: [
      {
        id: 'test-1',
        address: 'Test Property, Montreal',
        price: 1500,
        bedrooms: 2
      }
    ],
    status: 'minimal_server'
  });
});

// Serve static files
app.use(express.static(__dirname + '/../client/public'));

// Catch all - serve index.html
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/../client/public/index.html');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Minimal server running on port ${PORT}`);
  console.log(`🌐 Health: http://localhost:${PORT}/health`);
  console.log(`🌐 Test: http://localhost:${PORT}/test`);
  console.log(`🌐 Properties: http://localhost:${PORT}/api/properties`);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});