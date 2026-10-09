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

export const getCertificateDownloadUrl = (cert) => {
  if (!cert) return '#';
  const token = localStorage.getItem('hfa_token') || '';
  const certId = cert._id || cert.id;

  // If no certificate_url, route through backend download endpoint which auto-generates the PDF
  if (!cert.certificate_url && !cert.document_url && !cert.pdf_url) {
    return getPdfUrl(`/api/certificates/${certId}/download?token=${encodeURIComponent(token)}&download=1`);
  }

  const rawUrl = cert.certificate_url || cert.document_url || cert.pdf_url;
  // If it's a relative path or an internal backend file endpoint, ensure download=1 query parameter is set
  if (rawUrl.startsWith('/') || rawUrl.includes('/api/files/')) {
    const sep = rawUrl.includes('?') ? '&' : '?';
    const finalUrl = rawUrl.includes('download=') ? rawUrl : `${rawUrl}${sep}download=1`;
    return getPdfUrl(finalUrl);
  }

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    const sep = rawUrl.includes('?') ? '&' : '?';
    return rawUrl.includes('download=') ? rawUrl : `${rawUrl}${sep}download=1`;
  }

  return getPdfUrl(rawUrl);
};
