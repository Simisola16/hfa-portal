/**
 * Resolves a file URL stored in the database to a full viewable URL.
 *
 * Handles:
 *   1. Absolute URLs (http/https) — returned as-is
 *   2. New AWS S3 backend proxy paths (/api/files/s3/...) — prefixed with API URL
 *   3. Legacy MongoDB GridFS paths (/api/files/:id) — prefixed with API URL
 *   4. Any other relative path starting with / — prefixed with API URL
 *   5. Non-slash relative paths — joined to API URL with /
 */
const API_URL = import.meta.env.VITE_API_URL || 'https://backend.hfaportal.company';

export const getPdfUrl = (url) => {
  if (!url) return '#';

  // Already a full absolute URL (S3 direct, CDN, HTTP/HTTPS)
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  // Backend-proxied path — includes both S3 (/api/files/s3/...) and legacy GridFS (/api/files/:id)
  if (url.startsWith('/')) return `${API_URL}${url}`;

  // Relative path without leading slash
  return `${API_URL}/${url}`;
};
