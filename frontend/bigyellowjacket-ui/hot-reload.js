#!/usr/bin/env node

// Simple hot reload script that watches for changes and refreshes the browser
const { spawn } = require('child_process');
const chokidar = require('chokidar');

console.log('🔥 Hot Reload Script Started');
console.log('📁 Watching for file changes...');

// Watch for changes in source files
const watcher = chokidar.watch([
  'src/**/*.{ts,tsx,js,jsx,css}',
  'public/**/*',
  '*.{json,ts,js}'
], {
  ignored: /node_modules/,
  persistent: true,
  ignoreInitial: true
});

let isReloading = false;

watcher.on('change', (path) => {
  if (isReloading) return;
  
  console.log(`📝 File changed: ${path}`);
  console.log('🔄 Triggering hot reload...');
  
  isReloading = true;
  
  // Send a message to the browser to reload
  // This will work if the browser is open to the dev server
  try {
    const { exec } = require('child_process');
    
    // Try to refresh the browser using AppleScript (macOS)
    exec('osascript -e "tell application \\"Safari\\" to do JavaScript \\"location.reload()\\" in document 1"', (error) => {
      if (error) {
        // Fallback: try Chrome
        exec('osascript -e "tell application \\"Google Chrome\\" to reload active tab of front window"', (error2) => {
          if (error2) {
            console.log('⚠️  Could not auto-refresh browser. Please refresh manually.');
          } else {
            console.log('✅ Browser refreshed (Chrome)');
          }
          isReloading = false;
        });
      } else {
        console.log('✅ Browser refreshed (Safari)');
        isReloading = false;
      }
    });
  } catch (err) {
    console.log('⚠️  Could not auto-refresh browser. Please refresh manually.');
    isReloading = false;
  }
});

watcher.on('add', (path) => {
  console.log(`➕ File added: ${path}`);
});

watcher.on('unlink', (path) => {
  console.log(`➖ File removed: ${path}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down hot reload...');
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down hot reload...');
  watcher.close();
  process.exit(0);
});

console.log('🎯 Hot reload is active! The browser will refresh when files change.');
console.log('Press Ctrl+C to stop.');
