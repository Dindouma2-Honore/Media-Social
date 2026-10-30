# Lien — Partie 1 : structure, authentification, profil

Application mobile React Native (Expo) + Supabase.
Charte graphique : bleu (principal), jaune (accent), rouge (erreurs / déconnexion).

## Ce que contient cette partie

- Navigation par fichiers (Expo Router) : écrans de connexion / inscription et 4 onglets (Accueil, Réseau, Messages, Profil)
- Authentification e-mail + mot de passe, session conservée sur le téléphone
- Routes protégées : connecté → onglets, non connecté → connexion
- Profil : affichage, modification (nom, pseudo, bio), photo de profil
- Onglets Accueil / Réseau / Messages : écrans « à venir », remplis dans les prochaines parties

## Pourquoi Supabase ?

Supabase est une base **PostgreSQL** avec, déjà prêts : comptes utilisateurs, stockage d'images et temps réel (utile pour la messagerie plus tard). Les données sont rangées dans des **tables** (comme des feuilles Excel), faciles à visualiser dans l'interface web. Les règles de sécurité (RLS) indiquent qui peut lire ou modifier chaque ligne.

## Installation

### 1. Créer le projet Supabase

1. Crée un compte et un projet sur https://supabase.com
2. Ouvre **SQL Editor > New query**, colle le contenu de `supabase/schema.sql`, clique sur **Run**
3. Pour les tests : **Authentication > Sign In / Providers > Email**, désactive **Confirm email** (sinon chaque inscription demande de cliquer sur un lien reçu par e-mail)
4. **Project Settings > API** : note l'URL du projet et la clé `anon` (ou « publishable »)

### 2. Créer l'application Expo

```bash
npx create-expo-app@latest lien
cd lien
npm run reset-project        # vide le projet d'exemple (accepte de déplacer vers app-example)
```

Copie ensuite dans le dossier `lien` les dossiers/fichiers de cette archive :
`app/`, `components/`, `constants/`, `lib/`, `supabase/`, `.env.example` (remplace ce qui existe).

Installe les dépendances :

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-image-picker
```

### 3. Configurer les clés

```bash
cp .env.example .env
```

Ouvre `.env` et colle ton URL et ta clé Supabase. Ajoute aussi `.env` à ton `.gitignore`.

### 4. Lancer

```bash
npx expo start -c
```

Scanne le QR code avec **Expo Go** sur ton téléphone (ou appuie sur `a` pour un émulateur Android).

## Structure

```
app/
  _layout.tsx          Racine : fournit la session, protège les routes
  (auth)/              Écrans visibles si NON connecté
    login.tsx
    register.tsx
  (tabs)/              Écrans visibles si connecté
    _layout.tsx        Barre d'onglets
    index.tsx          Accueil (fil d'actualité à venir)
    network.tsx        Réseau (à venir)
    messages.tsx       Messages (à venir)
    profile.tsx        Mon profil
  edit-profile.tsx     Modification du profil (fenêtre modale)
components/            Button, Input, Avatar, AuthLayout, EmptyState
constants/theme.ts     Couleurs, espacements, nom de l'app
lib/
  supabase.ts          Connexion à Supabase
  auth.tsx             Contexte d'authentification (useAuth)
  validation.ts        Règles de validation
  types.ts             Types TypeScript
supabase/schema.sql    Tables, sécurité, stockage
```

## Notions React Native vues dans cette partie

| Notion | Où la voir |
|---|---|
| `View`, `Text`, `Image`, `ScrollView`, `Pressable`, `TextInput` | partout |
| `StyleSheet` et flexbox | tous les fichiers |
| Navigation par fichiers, groupes `(auth)` / `(tabs)`, modale | `app/` |
| Routes protégées (`Stack.Protected`) | `app/_layout.tsx` |
| Contexte React + hooks (`useState`, `useEffect`, `useCallback`, `useMemo`) | `lib/auth.tsx` |
| Formulaires, validation, clavier (`KeyboardAvoidingView`) | `register.tsx`, `AuthLayout.tsx` |
| Pull-to-refresh (`RefreshControl`) | `profile.tsx` |
| Sélection et envoi d'image (`expo-image-picker`, Supabase Storage) | `edit-profile.tsx` |

## Pour tester

1. Crée un compte depuis l'écran d'inscription
2. Vérifie dans Supabase (**Table Editor > profiles**) que la ligne a bien été créée
3. Ferme et rouvre l'application : tu dois rester connecté
4. Modifie ton profil et ajoute une photo
5. Déconnecte-toi, puis reconnecte-toi

## Problèmes fréquents

- **« Database error saving new user »** : le script `schema.sql` n'a pas été exécuté en entier.
- **Après l'inscription, rien ne se passe** : la confirmation d'e-mail est activée dans Supabase (voir étape 1.3).
- **Les clés `.env` ne sont pas prises en compte** : relance avec `npx expo start -c`.
- **L'envoi de la photo échoue** : vérifie que le bucket `avatars` existe (Storage) et que les règles du script ont bien été créées.
