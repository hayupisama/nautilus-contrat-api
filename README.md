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

## Licence

[PolyForm Noncommercial 1.0.0](LICENSE)
