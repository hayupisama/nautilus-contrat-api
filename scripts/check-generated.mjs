// Vérifie qu'aucun type généré n'est instable (InlineObject*, *200Response, ...).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const forbidden = [/InlineObject/i, /\d{3}Response/, /InlineResponse/i];
const bad = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (forbidden.some((re) => re.test(name))) bad.push(p);
  }
}

walk('generated');
if (bad.length) {
  console.error('Types générés interdits :\n' + bad.join('\n'));
  process.exit(1);
}
console.log('Génération conforme : aucun type InlineObject / *200Response.');
