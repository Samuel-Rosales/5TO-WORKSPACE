const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repos = [
  { name: 'BACKEND-5TO', url: 'https://github.com/Samuel-Rosales/BACKEND-5TO.git' },
  { name: 'FRONTEND-5TO', url: 'https://github.com/EDGAR-BRI/FRONTEND-5TO.git' }
];

const rootDir = path.join(__dirname, '..');

console.log('Inicializando 5TO-WORSPASE...\n');

repos.forEach(({ name, url }) => {
  const targetPath = path.join(rootDir, name);

  if (fs.existsSync(targetPath)) {
    console.log(`Eliminando ${name} existente...`);
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  console.log(`Clonando ${name}...`);
  execSync(`git clone ${url} "${targetPath}"`, { stdio: 'inherit' });
  console.log(`${name} clonado exitosamente.\n`);
});

console.log('Inicialización completada!');
console.log('Ejecuta "npm install" para instalar las dependencias de los workspaces.');