// Charte graphique : bleu (principal), jaune (accent), rouge (erreurs / actions dangereuses).
// Pour changer le nom ou les couleurs de l'app, tout se passe ici.

export const appName = 'Media Social';

export const colors = {
  // Bleu : couleur principale (en-têtes, boutons, liens)
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primaryLight: '#DBEAFE',

  // Jaune : accent (mise en avant, anneau d'avatar, bouton secondaire)
  accent: '#FACC15',
  accentDark: '#CA8A04',

  // Rouge : erreurs, déconnexion, suppression
  danger: '#DC2626',
  dangerLight: '#FEE2E2',

  // Neutres
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textOnAccent: '#0F172A',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  white: '#FFFFFF',
};

export const darkColors = {
  ...colors,
  primaryLight: '#1E3A5F',
  danger: '#F87171',
  dangerLight: '#3B1D26',
  background: '#0B1220',
  surface: '#131D2E',
  border: '#2A3850',
  text: '#F1F5F9',
  textMuted: '#A3B1C6',
  white: '#FFFFFF',
};

export type AppColors = typeof colors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
};
