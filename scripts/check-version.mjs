// Vérifie la cohérence des versions : info.version (openapi.yaml) == version (package.json),
// et, si la variable d'environnement TAG est définie, TAG == "v" + info.version.
// Tolérant aux guillemets simples/doubles et aux commentaires de fin de ligne.
import { readFileSync } from 'node:fs';

const yaml = readFileSync('openapi.yaml', 'utf8');
const info = /^info:\s*\r?\n((?:[ \t]+.*\r?\n|[ \t]*\r?\n)*)/m.exec(yaml);
const match = info && /^[ \t]+version:[ \t]*(?:"([^"]+)"|'([^']+)'|([^\s#'"]+))/m.exec(info[1]);
const apiVersion = match && (match[1] ?? match[2] ?? match[3]);
if (!apiVersion) {
  console.error('info.version introuvable dans openapi.yaml.');
  process.exit(1);
}
const pkgVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
if (pkgVersion !== apiVersion) {
  console.error(`package.json (${pkgVersion}) et info.version (${apiVersion}) divergent.`);
  process.exit(1);
}
const tag = process.env.TAG;
if (tag && tag !== `v${apiVersion}`) {
  console.error(`Le tag ${tag} ne correspond pas à info.version (${apiVersion}).`);
  process.exit(1);
}
console.log(`Version du contrat : ${apiVersion}`);
