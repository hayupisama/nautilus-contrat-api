# CLAUDE.md — nautilus-contrat-api

## Rôle

Contrat-first : `openapi.yaml` (OpenAPI 3.1) est la source de vérité de l'API. Générés à partir de lui :
interfaces JAX-RS (nautilus-api), client Dart (nautilus-flutter-commun), client TypeScript Angular (nautilus-back-office).

## État

Brouillon v0.1.0 issu du cahier des charges (section 8.3). À compléter au fil du lot 0.

## Règles

- Versionnement sémantique dans `info.version` + tag git `vX.Y.Z`. Changement cassant = version majeure.
- Noms : chemins en kebab-case anglais, schémas en PascalCase, propriétés en camelCase. Termes : voir `nautilus/docs/glossaire.md`.
- Chaque opération a `operationId`, `summary` en français, réponses d'erreur au format `Problem` (RFC 9457).
- Valider avant chaque commit : `npx @redocly/cli lint openapi.yaml`.
- Ne jamais introduire de donnée de santé (pathologie) dans les schémas : uniquement des besoins fonctionnels.

## Contexte projet (commun)

- Projet : **Nautilus** (nom de code), appli VTC marketplace dédiée aux PMR, lancement à Nantes (métropole + aéroport + gare).
- Side project, développeur unique, budget quasi nul, < 5 h/semaine, démarrage janvier 2027.
- Référence fonctionnelle : `nautilus/docs/cahier-des-charges.md`. Glossaire : `nautilus/docs/glossaire.md`. Décisions transverses : `nautilus/docs/decisions.md`.
- Lot en cours : **lot 0 – prototype** avec données fictives. Objectif : un prototype fonctionnel et démontrable. La validation terrain est faite par un autre intervenant.
- Licence : PolyForm Noncommercial 1.0.0. Ne jamais ajouter de dépendance dont la licence interdit cet usage.

## Règles transverses

- Langue : identifiants de code en anglais (voir glossaire FR -> EN) ; docs, commits et messages à l'utilisateur en français.
- Commits : Conventional Commits. Ne jamais pousser ni ouvrir de PR sans accord explicite.
- Accessibilité WCAG 2.2 AA obligatoire sur toute interface : c'est un critère d'acceptation, pas une option.
- Données : profil de besoins = besoins fonctionnels, jamais de pathologie. Aucune donnée personnelle réelle dans le code, les tests ou les fixtures.
- Secrets : jamais dans le dépôt (même privé).
- Contrat d'API : la source de vérité est `nautilus-contrat-api`. Ne jamais modifier un client généré à la main.

## Sessions Claude Code

- Au démarrage, le dernier résumé est injecté automatiquement (hook SessionStart). Commande `/reprise` pour reprendre proprement.
- En fin de session, ou quand l'utilisateur annonce une pause : `/cloture`.
- Protocole : `.claude/sessions/_PROTOCOLE.md`. Ce dossier est réservé à Claude Code ; ne pas le mentionner dans la documentation destinée aux humains.
