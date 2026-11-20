# Changelog

Format inspiré de Keep a Changelog. Versionnement sémantique ; avant 1.0.0, un changement cassant
peut intervenir dans une version mineure (décision D2).

## [0.2.0] - 2026-11-20

### Ajouté
- Outillage : `redocly.yaml` (`recommended-strict`, règle `x-nautilus-roles` obligatoire), `package.json` (scripts `lint`, `generate:*`, `generate:check`), `scripts/check-generated.mjs`.
- Comptes : `GET /me` (`Account`, `Role`, `PassengerSummary` ; structure prête pour passagers gérés par un réservant, Q1 = C).
- Réservations : listes passager, chauffeur et admin paginées et filtrées (`BookingPage`).
- Chauffeurs : lecture et écriture du profil, des véhicules, de la grille tarifaire, des disponibilités, de la zone d'intervention (`ServiceArea`, GeoJSON Polygon) ; liste et téléchargement des justificatifs.
- Administration : `GET /admin/drivers`, `GET /admin/bookings`.
- Erreurs : réponses réutilisables 400/401/403/404/409/413/415/422 en `application/problem+json`, `Problem` enrichi (`errors`, URN `urn:nautilus:problem:<code>`).
- Sécurité : description OIDC (Authorization Code + PKCE), serveur local en premier.
- `Booking` : `needsProfile` (copie figée à la demande, Q3 = A), `passengerContact` (visible du chauffeur après acceptation, Q2 = B), `companions`, `withWaiting`, `comment`, dates et annulation.
- Extension `x-nautilus-roles` sur chaque opération.

### Modifié
- Enums et objets en ligne extraits en schémas nommés (plus de `InlineObject*`).
- Les PUT renvoient l'objet enregistré (200 avec corps).
- `BookingRequest` : retrait de `bookerId` (déduit du jeton), champs explicites (plus d'`allOf`), + `comment`.
- Montants : `minimum: 0`, `multipleOf: 0.01` ; `EstimatedPrice.currency` en enum `Currency [EUR]`.
- `Problem` : `type`, `title`, `status` obligatoires.
- `uploadDriverDocument` : `file` en `format: binary`, réponse 201 `DriverDocument`.
- `ServiceArea` limité à `Polygon` au lot 0.

### Supprimé
- Aucune route `/auth/*` (portée par Keycloak, décision D1).
