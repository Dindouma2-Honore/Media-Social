# Backend API MediaSocial

Backend Laravel 13 pour l'application Expo MediaSocial. Base de données MySQL ou PostgreSQL. Les réponses API sont JSON; les routes protégées attendent `Authorization: Bearer <token>`.

## Installation

1. Installer PHP 8.3+, Composer et un serveur MySQL (ou PostgreSQL).
2. Depuis `backend/` : `composer install`, copier `.env.example` vers `.env`, puis configurer `APP_URL`, `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME` et `DB_PASSWORD`.
3. Lancer `php artisan key:generate`, `php artisan migrate`, puis `php artisan serve --host 0.0.0.0`.
4. Utiliser l'adresse IP du serveur sur le même réseau que le téléphone. Ne pas configurer l'APK avec `localhost`.

## Routes principales (`/api/v1`)

| Méthode | Route | Fonction |
|---|---|---|
| POST | `/auth/register` | inscription (`email`, `password`, `username`, `full_name`) |
| POST | `/auth/login` | connexion, renvoie un token bearer |
| GET | `/auth/me` | compte courant |
| POST | `/auth/logout` | révoquer le token courant |
| GET/PATCH | `/profile` | afficher / modifier le profil |
| GET | `/users?q=...` | rechercher les membres |
| GET/POST | `/posts` | fil paginé / créer une publication |
| DELETE | `/posts/{id}` | supprimer sa publication |
| POST | `/posts/{id}/like` | basculer le like |
| GET/POST | `/posts/{id}/comments` | lire / ajouter les commentaires |
| DELETE | `/comments/{id}` | supprimer son commentaire ou un commentaire sous son post |
| GET | `/connections` | invitations et contacts |
| POST | `/connections/{userId}` | inviter |
| POST | `/connections/{id}/accept` | accepter une invitation reçue |
| PUT/DELETE | `/follows/{userId}` | suivre / ne plus suivre |
| GET | `/conversations` | liste des conversations |
| POST | `/conversations/{userId}` | ouvrir une conversation avec un contact |
| GET/POST | `/conversations/{id}/messages` | lire / envoyer des messages |
| POST | `/conversations/{id}/read` | marquer les messages comme lus |
| GET | `/notifications` | lire les notifications |
| POST | `/notifications/read` | marquer les notifications comme lues |

Les listes utilisent la pagination Laravel (`data`, `links`, `meta`). Les dates sont en UTC. Les fichiers médias sont pour l'instant transmis par URL (`image_url`, `video_url`, `avatar_url`); l'upload local/S3 reste à configurer.

## Raccordement Expo

Le client actuel appelle directement Supabase (`src/lib/supabase.ts`). Il faut remplacer ces appels par un client HTTP configuré avec `EXPO_PUBLIC_API_URL`, conserver le token reçu dans un stockage sécurisé et adapter la sérialisation des objets paginés. Le backend est créé séparément; cette migration du client n'est pas incluse ici.
