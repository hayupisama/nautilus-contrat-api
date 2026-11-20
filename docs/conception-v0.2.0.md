# Conception du contrat v0.2.0 (lot 0)

Statut : proposition de l'architecte logiciel, 2026-11-20. Base : `openapi.yaml` v0.1.0, cahier des charges (sections 4, 5, 8), US du lot 0 dans tous les dépôts.

Objectif : un contrat qui couvre tout le lot 0, dont on génère sans retouche le serveur JAX-RS (nautilus-api), le client Dart (nautilus-flutter-commun) et le client TypeScript Angular (nautilus-back-office).

## 1. Constat sur la v0.1.0

Le lint Redocly (`recommended`) passe, mais il manque des pièces pour le lot 0 :

- pas de `GET /me`, pas de listes de réservations (passager, chauffeur, admin), pas de liste des chauffeurs à valider ;
- aucune lecture (`GET`) du profil chauffeur : véhicules, tarifs, disponibilités, justificatifs ;
- pas de schéma pour les aides proposées par le chauffeur et l'acceptation des chiens, pourtant nécessaires au matching (CDC 5.3) ;
- pas de zone d'intervention (`ServiceArea`) ;
- erreurs : seulement 400/404/409 ponctuels, ni 401/403 ni 422 ; `Problem` sans champ obligatoire ;
- corps de requête et énumérations en ligne : les générateurs produisent des types `InlineObject1`, `UpdateBookingStatusRequest`... instables ;
- constructions propres à OpenAPI 3.1 mal gérées par openapi-generator (`const`, `contentMediaType`) ;
- `BookingRequest.bookerId` fourni par le client alors qu'il doit venir du jeton.

## 2. Conventions (à appliquer à tout le fichier)

| Sujet | Règle |
| --- | --- |
| Chemins | kebab-case anglais, noms au pluriel, actions métier en sous-ressource nominale (`/acceptance`, `/cancellation`) |
| `operationId` | camelCase `verbeObjet` : `get`, `list`, `create`, `update` (PUT d'un objet), `replace` (PUT d'une liste), verbe métier (`acceptBooking`) ; unique |
| Schémas | PascalCase, termes du glossaire ; **aucun objet ni enum en ligne** dans un corps de requête, une réponse ou une propriété réutilisée : tout passe par `components/schemas` |
| Propriétés | camelCase ; identifiants `xxxId` en `uuid` ; champs calculés par le serveur marqués `readOnly: true` |
| Enums | valeurs en `UPPER_SNAKE_CASE`, schéma nommé (`BookingStatus`, `DriverValidationStatus`...) |
| Dates | `date-time` ISO 8601 avec décalage, renvoyées en UTC ; heures de disponibilité `HH:mm` en heure locale Europe/Paris |
| Montants | `number`, `minimum: 0`, `multipleOf: 0.01`, en euros ; `BigDecimal` côté serveur, affichage seul côté clients (le calcul reste serveur) |
| Nullabilité | pas de `type: [x, 'null']` : un champ absent est omis (meilleure génération Dart/TS) |
| Compatibilité générateurs | sous-ensemble 3.1 compatible 3.0 : `enum: [EUR]` au lieu de `const`, `format: binary` pour les fichiers, pas de `prefixItems`, `if/then` ni `$ref` avec voisins |
| Rôles | extension `x-nautilus-roles` sur chaque opération (documentation et contrôle du lint) ; le serveur l'applique avec `@RolesAllowed` |
| Résumés | `summary` en français, une phrase, à l'infinitif |

## 3. Sécurité

- Schéma unique `oidc` (`openIdConnect`), appliqué globalement. `openIdConnectUrl` pointe sur le Keycloak local (U44) : `http://localhost:8180/realms/nautilus/.well-known/openid-configuration` (port à confirmer par archi-infra dans U44).
- `servers` : `http://localhost:8080/v1` (local, en premier) puis l'URL de production provisoire.
- Flux : Authorization Code + PKCE (S256) pour les deux applis Flutter et le back-office (clients publics). L'API est un serveur de ressources (jeton Bearer). PKCE n'est pas exprimable dans `openIdConnect` : on le décrit dans `components.securitySchemes.oidc.description`.
- Rôles Keycloak (rôles de royaume, minuscules) : `passenger`, `booker`, `driver`, `admin`. Un même compte peut cumuler `passenger` et `booker`. Côté contrat, le schéma `Role` expose `PASSENGER`, `BOOKER`, `DRIVER`, `ADMIN`.
- Les routes `/auth/code` et `/auth/token` du CDC 8.3 disparaissent : c'est Keycloak qui les porte, pas notre API.
- Contrôle d'accès « propriétaire » en plus du rôle : un passager ne lit que ses données, un réservant celles des passagers qu'il gère, un chauffeur ses propres données et les réservations qui lui sont adressées.
- Ressource existante mais non visible pour l'appelant : **404** (pas 403), pour ne pas révéler son existence. 403 = rôle absent.

## 4. Périmètre v0.2.0

Légende rôles : P passager, B réservant, D chauffeur, A admin. « (soi) » = contrôle propriétaire.

### Comptes (nouveau tag `accounts`)

| Méthode | Chemin | operationId | Rôles | Réponse |
| --- | --- | --- | --- | --- |
| GET | `/me` | `getCurrentAccount` | P B D A | `Account` ; crée le compte à la première connexion (U09) |

### Profil de besoins

| Méthode | Chemin | operationId | Rôles | Réponse |
| --- | --- | --- | --- | --- |
| GET | `/passengers/{passengerId}/needs-profile` | `getNeedsProfile` | P (soi), B (géré) | `NeedsProfile` |
| PUT | `/passengers/{passengerId}/needs-profile` | `updateNeedsProfile` | P (soi), B (géré) | `NeedsProfile` |

### Recherche

| Méthode | Chemin | operationId | Rôles | Réponse |
| --- | --- | --- | --- | --- |
| POST | `/driver-searches` | `searchDrivers` | P, B | `DriverOffer[]` (liste vide = demande non servie, enregistrée côté serveur) |

### Réservations

| Méthode | Chemin | operationId | Rôles | Réponse |
| --- | --- | --- | --- | --- |
| POST | `/bookings` | `createBooking` | P, B | 201 `Booking` + en-tête `Location` |
| GET | `/bookings/{bookingId}` | `getBooking` | P B D (parties), A | `Booking` |
| GET | `/passengers/{passengerId}/bookings` | `listPassengerBookings` | P (soi), B (géré) | `BookingPage` |
| GET | `/drivers/{driverId}/bookings` | `listDriverBookings` | D (soi) | `BookingPage` |
| POST | `/bookings/{bookingId}/acceptance` | `acceptBooking` | D (destinataire) | `Booking` |
| POST | `/bookings/{bookingId}/rejection` | `rejectBooking` | D (destinataire) | `Booking` |
| POST | `/bookings/{bookingId}/status` | `updateBookingStatus` | D (destinataire) | `Booking` ; corps `BookingStatusChange` |
| POST | `/bookings/{bookingId}/cancellation` | `cancelBooking` | P B D (parties) | `Booking` ; corps `BookingCancellation` (facultatif) |
| POST | `/bookings/{bookingId}/rating` | `rateBooking` | P, B (parties) | 201 sans corps ; implémentation au lot 1, contrat conservé |

Filtres des listes : `status` (répétable, `BookingStatus`), `from` / `to` (sur `pickupAt`), `page` (base 0, défaut 0), `size` (défaut 20, max 100). Tri : `pickupAt` croissant. « À venir / passées » côté appli = `from=maintenant` ou `to=maintenant`.

### Chauffeurs

| Méthode | Chemin | operationId | Rôles | Corps / réponse |
| --- | --- | --- | --- | --- |
| GET | `/drivers/{driverId}/profile` | `getDriverProfile` | D (soi), A | `DriverProfile` |
| PUT | `/drivers/{driverId}/profile` | `updateDriverProfile` | D (soi) | `DriverProfile` (champs de validation en lecture seule) |
| GET / PUT | `/drivers/{driverId}/vehicles` | `listDriverVehicles` / `replaceDriverVehicles` | D (soi) ; GET aussi A | `Vehicle[]` |
| GET / PUT | `/drivers/{driverId}/price-grid` | `getPriceGrid` / `updatePriceGrid` | D (soi) ; GET aussi A | `PriceGrid` |
| GET / PUT | `/drivers/{driverId}/availabilities` | `listAvailabilities` / `replaceAvailabilities` | D (soi) ; GET aussi A | `Availability[]` |
| GET / PUT | `/drivers/{driverId}/service-area` | `getServiceArea` / `updateServiceArea` | D (soi) ; GET aussi A | `ServiceArea` |
| GET | `/drivers/{driverId}/documents` | `listDriverDocuments` | D (soi), A | `DriverDocument[]` |
| POST | `/drivers/{driverId}/documents` | `uploadDriverDocument` | D (soi) | multipart -> 201 `DriverDocument` |
| GET | `/drivers/{driverId}/documents/{documentId}/file` | `downloadDriverDocument` | D (soi), A | binaire (`application/pdf`, `image/jpeg`, `image/png`) |

Les PUT renvoient désormais l'objet enregistré (200 + corps) au lieu d'une réponse vide : le client se resynchronise sans relire.

### Administration

| Méthode | Chemin | operationId | Rôles | Réponse |
| --- | --- | --- | --- | --- |
| GET | `/admin/drivers` | `listDriversForAdmin` | A | `DriverSummaryPage` ; filtre `validationStatus`, pagination |
| POST | `/admin/drivers/{driverId}/validation` | `validateDriver` | A | `DriverProfile` ; corps `DriverValidationDecision` (motif obligatoire) |
| GET | `/admin/bookings` | `listBookingsForAdmin` | A | `BookingPage` ; filtres `status`, `from`, `to`, pagination |

L'admin consulte le détail d'un chauffeur via les GET de `/drivers/{driverId}/...` (rôle A autorisé) : pas de duplication sous `/admin`.

### Hors v0.2.0

WebSocket de position (lot 1, hors OpenAPI), notifications, création de passagers gérés par un réservant (voir question Q1), favoris, réservation immédiate, signalements.

## 5. Schémas

Nouveaux :

- `Account` : `id`, `roles: Role[]`, `displayName`, `passengerId?` (si P), `driverId?` (si D), `managedPassengers: PassengerSummary[]` (si B ; contient aussi soi-même si P).
- `Role`, `PassengerSummary` (`id`, `displayName`).
- `BookingStatus` (enum existant extrait), `BookingProgressStatus` (`DRIVER_EN_ROUTE`, `DRIVER_ARRIVED`, `IN_PROGRESS`, `COMPLETED`), `BookingStatusChange` (`status`), `BookingCancellation` (`reason?` max 500).
- `BookingPage`, `DriverSummaryPage` : `items`, `page`, `size`, `totalItems`, `totalPages`.
- `DriverProfile` : `id` (ro), `displayName`, `offeredAssistance: AssistanceType[]`, `offersTransferHelp`, `acceptsAssistanceAnimals`, `signLanguage`, `trainings: string[]` (max 20 x 200), `validationStatus` (ro), `certifiedPmr` (ro, toujours `false` au lot 0), `vtcCardNumber`, `vtcRegistryNumber`.
- `DriverValidationStatus` (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`), `DriverValidationDecision` (`decision`, `reason` 1-1000), `DriverSummary` (`id`, `displayName`, `validationStatus`, `pendingDocuments`, `createdAt`).
- `DriverDocument` : `id`, `type`, `status: DriverDocumentStatus` (`PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`), `expiresOn?`, `fileName`, `mediaType`, `uploadedAt` (tous ro sauf `type`, `expiresOn`).
- `ServiceArea` : géométrie GeoJSON (`type: Polygon` au lot 0, `coordinates` ; plusieurs zones viendront par une évolution versionnée selon D2, ex. propriété `areas: ServiceArea[]`), WGS 84 ; défaut serveur : Nantes Métropole + aéroport + gare.
- `PassengerContact` : `displayName`, `phone`, `preferredContact` (voir Q2).
- Enums extraits : `MobilityType`, `WheelchairWeightRange`, `TransferAbility`, `AssistanceType`, `PreferredContact`, `ComfortNeed`, `VehicleType`, `DayOfWeek`, `SortCriterion`, `ValidationDecision`.

Modifiés :

- `Booking` : + `companions`, `withWaiting`, `comment` (max 500), `createdAt`, `updatedAt`, `lateCancellation` (ro), `cancellationReason`, `driverDisplayName`, `passengerDisplayName`, `needsProfile` (ro, copie figée à la demande, voir Q3), `passengerContact` (ro, voir Q2) ; tous les champs serveur en `readOnly`.
- `BookingRequest` : retrait de `bookerId` (déduit du jeton) ; + `comment`. Pour éviter les soucis d'`allOf` à la génération Dart, `BookingRequest` reprend explicitement les champs de `DriverSearchRequest` (pas d'héritage).
- `EstimatedPrice.currency` : `enum: [EUR]`. `Vehicle` : + `id` (ro). Upload : `file` en `format: binary`.
- `Problem` : `type`, `title`, `status` obligatoires ; + `errors: FieldError[]` (`field`, `message`) pour les 400.

## 6. Erreurs

Réponses réutilisables `components/responses` : `BadRequest` (400), `Unauthorized` (401), `Forbidden` (403), `NotFound` (404), `Conflict` (409), `PayloadTooLarge` (413), `UnsupportedMediaType` (415), `UnprocessableContent` (422), toutes en `application/problem+json` -> `Problem`.

- Toute opération : 401, 403. Toute opération avec identifiant en chemin : 404. Tout corps : 400.
- 400 = format ou schéma invalide. 422 = règle métier violée. 409 = transition d'état impossible.
- `type` = URN stable `urn:nautilus:problem:<code>` (indépendant du nom de domaine). Catalogue initial, listé dans la description de `Problem` :

| Code | Statut | Cas |
| --- | --- | --- |
| `validation-error` | 400 | Schéma invalide (détail dans `errors`) |
| `unauthenticated` / `forbidden` / `not-found` | 401 / 403 / 404 | |
| `booking-too-soon` | 422 | Départ à moins de 12 h |
| `driver-not-compatible` | 422 | Contraintes bloquantes non respectées (revérifiées à la demande) |
| `driver-not-available` | 422 | Hors disponibilités ou hors zone |
| `driver-not-approved` | 422 | Chauffeur non validé |
| `availability-overlap` | 422 | Créneaux qui se chevauchent |
| `invalid-status-transition` | 409 | Transition interdite par la machine à états |
| `response-deadline-passed` | 409 | Acceptation après l'échéance de 1 h |
| `rating-already-exists` | 409 | Course déjà notée |
| `file-too-large` / `unsupported-file-type` | 413 / 415 | Justificatif (10 Mo max, PDF/JPEG/PNG) |

## 7. Versionnage

- `info.version: 0.2.0`, tag `v0.2.0` après fusion. Le préfixe de chemin `/v1` ne bouge pas avant la 1.0.
- La v0.2.0 contient des changements cassants (retrait de `bookerId`, schémas renommés, PUT avec corps de réponse). Aucun consommateur n'existe encore. Règle proposée : avant 1.0.0, le semver autorise le cassant en version mineure ; la règle « cassant = majeure » du CLAUDE.md s'applique à partir de la 1.0.0 (voir décision D2).
- Chaque version listée dans un `CHANGELOG.md` du dépôt (Ajouté / Modifié / Supprimé).

## 8. Décisions à consigner dans `nautilus/docs/decisions.md`

Proposées, à écrire par l'orchestrateur (hors de mon dépôt de travail) :

- **D1 — Authentification hors API** : connexion portée par Keycloak (Authorization Code + PKCE, clients publics) ; l'API est serveur de ressources. Les routes `/auth/*` du CDC 8.3 sont abandonnées.
- **D2 — Versionnage du contrat** : semver ; cassant autorisé en mineure tant que < 1.0.0 ; à partir de 1.0.0, cassant = majeure. Préfixe `/v1` stable.
- **D3 — Rôles** : rôles de royaume Keycloak `passenger`, `booker`, `driver`, `admin`, cumulables ; contrôle rôle + propriétaire ; 404 pour une ressource non visible.
- **D4 — Erreurs** : RFC 9457, `type` en URN `urn:nautilus:problem:<code>`, 400 schéma / 422 règle métier / 409 état.
- **D5 — Compatibilité générateurs** : OpenAPI 3.1 limité au sous-ensemble compatible 3.0 ; aucun type en ligne ; montants `number` en euros, `BigDecimal` serveur.
- **D6 — Routes en anglais** : le contrat suit le glossaire (anglais) ; les routes françaises du CDC 8.3 sont indicatives (incohérence signalée, le CDC n'est pas modifié sans Fouad).

## 9. Découpage pour dev-back (U01, branche `feat/u01-contrat-v0.2.0`)

1. **Outillage** : `redocly.yaml` (`extends: recommended-strict` ; règles `operation-4xx-problem-details-rfc7807`, `paths-kebab-case`, `operation-summary`, `operation-operationId-unique`, `tag-description` en erreur ; règle configurable `rule/operation-roles` exigeant `x-nautilus-roles` sur chaque opération). `package.json` minimal avec scripts `lint` et `generate:check` (versions épinglées de `@redocly/cli` et `@openapitools/openapi-generator-cli`).
2. **Socle** : `info.version`, `servers` local, description PKCE de `oidc`, tag `accounts`, `Problem` + `FieldError`, réponses d'erreur réutilisables, paramètres `Page`, `Size`, `BookingStatusFilter`, `From`, `To`, `DocumentId`.
3. **Extraction** : enums et corps en ligne -> schémas nommés (section 5) ; `const` et `contentMediaType` remplacés.
4. **Ajouts** : `/me`, listes de réservations, profil chauffeur, GET chauffeur, zone, justificatifs (liste, téléchargement), admin (section 4) ; `x-nautilus-roles` partout.
5. **Modifications** : `Booking`, `BookingRequest`, réponses des PUT, erreurs complètes par opération (section 6).
6. **Validation** puis `CHANGELOG.md`, PR, revue archi-logiciel, fusion, tag `v0.2.0`.

Fichiers : `openapi.yaml`, `redocly.yaml`, `package.json`, `CHANGELOG.md`, `README.md` (commandes). Un seul fichier OpenAPI (pas de découpage multi-fichiers au lot 0).

### Critères de validation

- `npx @redocly/cli lint openapi.yaml` : 0 erreur, 0 avertissement.
- Génération sans erreur dans `generated/` (ignoré par git), Java 21 présent sur le poste :
  - `openapi-generator-cli generate -g dart-dio -i openapi.yaml -o generated/dart`
  - `openapi-generator-cli generate -g typescript-angular -i openapi.yaml -o generated/ts`
  - `openapi-generator-cli generate -g jaxrs-spec -i openapi.yaml -o generated/jaxrs --additional-properties=interfaceOnly=true,useJakartaEe=true,returnResponse=false`
- Aucun type généré nommé `InlineObject*`, `*Request` non voulu, `*200Response` ou `Object` à la place d'un schéma (contrôle `grep` sur `generated/`).
- Chaque opération : `operationId`, `summary` en français, `x-nautilus-roles`, 401/403 et, si besoin, 400/404/409/422 en `Problem`.
- Aucun champ de pathologie ou de diagnostic.
- Note : la génération JAX-RS définitive (quarkus-openapi-generator ou jaxrs-spec) est tranchée dans U08 ; ici on vérifie seulement que le contrat est générable.

Estimation : l'ajout du profil chauffeur, de la zone et de l'admin chauffeurs dépasse le critère de l'issue ; prévoir 4 à 5 h au lieu de 3 h.

## 10. Questions métier (fermées)

- **Q1 — Réservant multi-passagers au lot 0.** A : un compte = un passager, pas de réservation pour un tiers au lot 0. B : le réservant crée et gère ses passagers dès le lot 0 (endpoints `POST/GET /passengers`). C : la structure est prête (`managedPassengers` dans `/me`, `passengerId` dans les chemins) mais les passagers gérés viennent du jeu de données fictives, sans écran de création. **Recommandation : C** (démontrable, sans coût, B au lot 1 sans casser le contrat).
- **Q2 — Coordonnées du passager pour le chauffeur.** A : visibles dès la demande. B : visibles seulement après acceptation (le profil de besoins reste visible dès la demande, déjà décidé). **Recommandation : B** (minimisation RGPD).
- **Q3 — Profil de besoins vu par le chauffeur.** A : copie figée au moment de la demande, stockée dans la réservation. B : profil courant du passager, lu en direct. **Recommandation : A** (le chauffeur accepte sur une base qui ne change pas ; une modification passe par une nouvelle demande).
