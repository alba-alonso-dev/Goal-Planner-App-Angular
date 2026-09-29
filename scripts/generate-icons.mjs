// Genera src/styles/icons.generated.css con solo los Bootstrap Icons que usa la aplicación.
// Uso: node scripts/generate-icons.mjs [--check]
//   --check  no escribe; falla si el fichero no está al día o si hay iconos desconocidos (para la CI).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC_DIR = 'src/app';
const OUTPUT = 'src/styles/icons.generated.css';
const ICONS_JSON = 'node_modules/bootstrap-icons/font/bootstrap-icons.json';
const FONT_DIR = '../../node_modules/bootstrap-icons/font/fonts';

const check = process.argv.includes('--check');
const codepoints = JSON.parse(readFileSync(ICONS_JSON, 'utf8'));

function* sourceFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* sourceFiles(path);
    else if (['.html', '.ts'].includes(extname(entry.name)) && !entry.name.endsWith('.spec.ts')) yield path;
  }
}

const used = new Set();
const unknown = new Map();
for (const file of sourceFiles(SRC_DIR)) {
  for (const [, name] of readFileSync(file, 'utf8').matchAll(/\bbi-([a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
    if (name in codepoints) used.add(name);
    else unknown.set(name, file);
  }
}

if (unknown.size) {
  for (const [name, file] of unknown) console.error(`Icono desconocido "bi-${name}" en ${file}`);
  process.exit(1);
}

const rules = [...used]
  .sort()
  .map(name => `.bi-${name}::before {\n  content: '\\${codepoints[name].toString(16)}';\n}`)
  .join('\n');

const css = `/* Generado por scripts/generate-icons.mjs a partir de los iconos usados en ${SRC_DIR}. No editar a mano. */
@font-face {
  font-display: block;
  font-family: 'bootstrap-icons';
  src:
    url('${FONT_DIR}/bootstrap-icons.woff2') format('woff2'),
    url('${FONT_DIR}/bootstrap-icons.woff') format('woff');
}

.bi::before,
[class^='bi-']::before,
[class*=' bi-']::before {
  display: inline-block;
  font-family: 'bootstrap-icons' !important;
  font-style: normal;
  font-weight: normal !important;
  font-variant: normal;
  text-transform: none;
  line-height: 1;
  vertical-align: -0.125em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

${rules}
`;

if (check) {
  if (!existsSync(OUTPUT) || readFileSync(OUTPUT, 'utf8') !== css) {
    console.error(`${OUTPUT} no está al día: ejecuta "npm run icons".`);
    process.exit(1);
  }
  console.log(`${OUTPUT} al día (${used.size} iconos).`);
} else {
  writeFileSync(OUTPUT, css);
  console.log(`${OUTPUT} generado con ${used.size} iconos.`);
}
