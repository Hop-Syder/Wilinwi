const fs = require('fs');
const path = require('path');

const DIRECTORIES_TO_SCAN = ['apps', 'packages'];
const EXCLUDED_DIRS = ['node_modules', 'dist', '.next', '.turbo'];
const TARGET_EXTENSIONS = ['.ts', '.tsx'];

const currentDate = new Date().toISOString().split('T')[0];

const HEADER_TEMPLATE = `/**
 * @author @hopsyder
 * @organization Nexus Partners
 * @description {DESCRIPTION}
 * @created ${currentDate}
 * @updated ${currentDate}
 * 🌐 ceo.nexuspartners.xyz
 * 📧 daoudaabassichristian@gmail.com
 */
// ──────────────────────────────────
`;

function generateDescription(filePath) {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];

  if (filePath.includes('apps/api')) {
    if (fileName.includes('controller'))
      return `Contrôleur API pour ${fileName.replace('.controller.ts', '')}`;
    if (fileName.includes('service'))
      return `Service métier pour ${fileName.replace('.service.ts', '')}`;
    if (fileName.includes('module'))
      return `Module d'injection de dépendances NestJS pour ${fileName.replace('.module.ts', '')}`;
    if (fileName.includes('mapper'))
      return `Mapper DTO/Entité pour ${fileName.replace('.mapper.ts', '')}`;
    if (fileName.includes('guard') || fileName.includes('decorator') || fileName.includes('pipe'))
      return `Utilitaire de sécurité/validation API : ${fileName}`;
    return `Composant Backend API : ${fileName}`;
  }

  if (filePath.includes('apps/web')) {
    if (fileName === 'page.tsx') return `Page Frontend (Route: ${parts[parts.length - 2]})`;
    if (fileName === 'layout.tsx')
      return `Layout de l'application (Route: ${parts[parts.length - 2] || 'racine'})`;
    if (fileName.includes('use-')) return `React Hook personnalisé : ${fileName}`;
    return `Composant Frontend Web : ${fileName}`;
  }

  if (filePath.includes('packages/ui')) {
    return `Composant UI partagé (Design System) : ${fileName}`;
  }

  if (filePath.includes('packages/types')) {
    return `Définitions de types partagés : ${fileName}`;
  }

  if (filePath.includes('packages/db')) {
    return `Modèle et gestionnaire de base de données : ${fileName}`;
  }

  if (filePath.includes('packages/offline')) {
    return `Gestionnaire de mode offline PWA : ${fileName}`;
  }

  return `Composant système : ${fileName}`;
}

function processDirectory(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        processDirectory(fullPath);
      }
    } else if (stat.isFile() && TARGET_EXTENSIONS.includes(path.extname(fullPath))) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('@organization Nexus Partners') || content.includes('@author @hopsyder')) {
    console.log(`[SKIPPED] ${filePath} (Header already exists)`);
    return;
  }

  const description = generateDescription(filePath);
  const header = HEADER_TEMPLATE.replace('{DESCRIPTION}', description);

  let finalContent = content;
  if (content.startsWith('"use client"') || content.startsWith("'use client'")) {
    const lines = content.split('\n');
    const useClientLine = lines[0];
    const rest = lines.slice(1).join('\n');
    finalContent = `${useClientLine}\n\n${header}\n${rest}`;
  } else {
    finalContent = `${header}\n${content}`;
  }

  fs.writeFileSync(filePath, finalContent, 'utf8');
  console.log(`[UPDATED] ${filePath}`);
}

DIRECTORIES_TO_SCAN.forEach((dir) => {
  const absolutePath = path.join(__dirname, '..', dir); // '..' car on est dans scripts/
  if (fs.existsSync(absolutePath)) {
    processDirectory(absolutePath);
  }
});

console.log('Traitement terminé !');
