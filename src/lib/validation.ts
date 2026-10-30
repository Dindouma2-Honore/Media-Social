// Nom d'utilisateur : 3 à 20 caractères, minuscules, chiffres et underscore.
export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export const USERNAME_HELP =
  "3 à 20 caractères : lettres minuscules, chiffres et _ uniquement.";

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
