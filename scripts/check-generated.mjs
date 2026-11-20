// Vérifie la stabilité des types générés :
// - pas de type en ligne (InlineObject*, *200Response, InlineResponse*) ;
// - pas de *Request non voulu (seuls les corps nommés dans le contrat sont autorisés) ;
// - pas de type générique « Object » à la place d'un schéma nommé.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const forbiddenNames = [/InlineObject/i, /\d{3}Response/, /InlineResponse/i];
// Schémas *Request déclarés dans openapi.yaml (forme PascalCase). À compléter si le contrat en ajoute.
const allowedRequests = new Set(['BookingRequest', 'DriverSearchRequest']);
// Types « Object » dans le code généré (modèles et APIs, par langage).
const objectTypes = [
  { dir: 'generated/dart/lib/src', re: /\bJsonObject\b|BuiltList<Object\??>|BuiltMap<String,\s*Object\??>/ },
  { dir: 'generated/ts', re: /:\s*object\b|<object>|Array<Object>|\{\s*\[key: string\]: any\s*\}/, ext: '.ts' },
  { dir: 'generated/jaxrs/src', re: /\b(private|public)\s+(List<Object>|Map<String,\s*Object>|Object)\s+\w+|<Object>/, ext: '.java' },
];
const bad = [];

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) files(p, out);
    else out.push(p);
  }
  return out;
}

const pascal = (s) => s.replace(/\.[^.]+$/, '').split(/[_-]/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');

for (const p of files('generated')) {
  const name = basename(p);
  if (forbiddenNames.some((re) => re.test(name))) bad.push(`Nom interdit : ${p}`);
  const base = pascal(name).replace(/(Test|Mixin)$/, '');
  if (/Request$/.test(base) && !allowedRequests.has(base)) bad.push(`*Request non voulu : ${p}`);
}

for (const { dir, re, ext } of objectTypes) {
  for (const p of files(dir)) {
    if (ext && !p.endsWith(ext)) continue;
    if (!ext && !p.endsWith('.dart')) continue;
    if (re.test(readFileSync(p, 'utf8'))) bad.push(`Type Object à la place d'un schéma : ${p}`);
  }
}

if (bad.length) {
  console.error('Types générés interdits :\n' + bad.join('\n'));
  process.exit(1);
}
console.log('Génération conforme : aucun InlineObject, *200Response, *Request non voulu ni Object générique.');
