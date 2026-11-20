# nautilus-contrat-api

Contrat OpenAPI de l'API du projet Nautilus (nom de code). Source de vérité : le code serveur (Quarkus)
et les clients (Dart, TypeScript) sont générés à partir de ce fichier.

- Spécification : [`openapi.yaml`](openapi.yaml)
- Conception de la version courante : [`docs/conception-v0.2.0.md`](docs/conception-v0.2.0.md)
- Historique : [`CHANGELOG.md`](CHANGELOG.md)

## Commandes

Prérequis : Node.js, Java 21 (génération).

```
npm install
npm run lint             # Redocly : 0 erreur, 0 avertissement attendu
npm run generate:check   # génère dart-dio, typescript-angular, jaxrs-spec dans generated/ (ignoré par git)
```

## Intégration continue

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) s'exécute sur chaque pull request et sur `main` :
`npm run lint` puis `npm run generate:check`. Sur un tag `vX.Y.Z`, il vérifie que le tag égale `info.version`,
génère les clients Dart (`dart-dio`) et TypeScript Angular, puis crée une release GitHub qui contient
`nautilus-client-dart-vX.Y.Z.zip`, `nautilus-client-typescript-angular-vX.Y.Z.zip` et `openapi-vX.Y.Z.yaml`.
Le contrôle de version vérifie aussi que `package.json` porte la même version que `info.version`, et la publication exige que le commit tagué soit ancêtre de `origin/main`. Les artefacts sont conservés 7 jours.
Aucun secret n'est requis (jeton `GITHUB_TOKEN` fourni par GitHub). Les actions sont épinglées par SHA.

### Déclenchement manuel (publier ou rejouer un tag existant)

Le workflow accepte `workflow_dispatch` avec les entrées `tag` (obligatoire, format `vX.Y.Z`) et `dry_run` (défaut `false` ; `true` génère les artefacts sans créer la release). Le fichier `ci.yml` utilisé est celui de la branche choisie avec `--ref` (par défaut `main`).

```
gh workflow run ci.yml -R hayupisama/nautilus-contrat-api -f tag=v0.2.0
gh workflow run ci.yml -R hayupisama/nautilus-contrat-api --ref us/3-ci-contrat -f tag=v0.2.0 -f dry_run=true   # essai à blanc
```

## Monter de version

1. Créer une branche `feat/...` ou `fix/...` et modifier `openapi.yaml`.
2. Choisir la version (SemVer, décision D2 : avant 1.0.0 un changement cassant est permis en mineure ; ensuite, majeure) et mettre à jour `info.version` dans `openapi.yaml` ainsi que `version` dans `package.json`.
3. Documenter le changement dans `CHANGELOG.md`.
4. Vérifier en local : `npm run lint` et `npm run generate:check`.
5. Ouvrir la pull request ; la CI doit être verte avant fusion.
6. Après fusion, depuis `main` à jour : `git tag vX.Y.Z && git push origin vX.Y.Z`.
7. Le workflow publie la release ; les dépôts consommateurs (`nautilus-api`, `nautilus-flutter-commun`, `nautilus-back-office`) pointent alors sur ce tag.

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE)
