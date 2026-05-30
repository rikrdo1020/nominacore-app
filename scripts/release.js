require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

if (!process.env.GH_TOKEN) {
  console.error('❌ GH_TOKEN no está definido. Creá un archivo .env en la raíz del proyecto con:');
  console.error('   GH_TOKEN=tu_github_token');
  process.exit(1);
}

console.log('🔧 Building Vite...');
execSync('vite build', { cwd: root, stdio: 'inherit' });

console.log('🔧 Building Electron...');
execSync('npm run build:electron', { cwd: root, stdio: 'inherit' });

console.log('🚀 Publishing release...');
execSync('electron-builder --publish always', { cwd: root, stdio: 'inherit' });

console.log('✅ Release complete!');
