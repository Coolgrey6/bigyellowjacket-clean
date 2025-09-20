#!/usr/bin/env node

const { spawn } = require('child_process');
const chokidar = require('chokidar');

let devServer = null;

function startDevServer() {
  console.log('🚀 Starting development server...');
  
  if (devServer) {
    console.log('🔄 Restarting development server...');
    devServer.kill();
  }
  
  devServer = spawn('npm', ['run', 'dev', '--', '--host', '--port', '5173'], {
    stdio: 'inherit',
    shell: true
  });
  
  devServer.on('close', (code) => {
    console.log(`Development server exited with code ${code}`);
  });
}

function stopDevServer() {
  if (devServer) {
    console.log('🛑 Stopping development server...');
    devServer.kill();
  }
}

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

watcher.on('change', (path) => {
  console.log(`📝 File changed: ${path}`);
  console.log('🔄 Auto-reloading...');
  startDevServer();
});

watcher.on('add', (path) => {
  console.log(`➕ File added: ${path}`);
  console.log('🔄 Auto-reloading...');
  startDevServer();
});

watcher.on('unlink', (path) => {
  console.log(`➖ File removed: ${path}`);
  console.log('🔄 Auto-reloading...');
  startDevServer();
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down auto-reload...');
  stopDevServer();
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down auto-reload...');
  stopDevServer();
  watcher.close();
  process.exit(0);
});

// Start the dev server initially
startDevServer();

console.log('🎯 Auto-reload is active! The server will restart when files change.');
console.log('Press Ctrl+C to stop.');
