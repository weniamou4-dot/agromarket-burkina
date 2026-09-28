// src/utils/media.js

/*
 * ============================================================
 * GESTION DES URL DE MÉDIAS
 * ============================================================
 */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";


/**
 * Retourne l'URL publique d'une image
 * retournée par FastAPI.
 */
export function getImageUrl(
  imagePath
) {
  if (!imagePath) {
    return null;
  }

  const value =
    String(imagePath).trim();

  if (!value) {
    return null;
  }

  /*
   * URL absolue
   */
  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  /*
   * Chemin relatif commençant par /
   *
   * Exemple :
   * /uploads/abc.jpg
   *
   * devient :
   * http://127.0.0.1:8000/uploads/abc.jpg
   */

  if (value.startsWith("/")) {
    return `${API_URL}${value}`;
  }

  /*
   * Chemin relatif sans /
   */

  return `${API_URL}/${value}`;
}


export function getApiUrl() {
  return API_URL;
}