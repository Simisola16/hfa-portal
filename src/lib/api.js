const API_URL = import.meta.env.VITE_API_URL || 'https://hfa-portal-backend.onrender.com';

function getToken() {
  return localStorage.getItem('hfa_token');
}

function isTokenImpersonated(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return !!payload.is_impersonation;
  } catch (e) {
    return false;
  }
}

async function request(method, path, body, isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401 && token && isTokenImpersonated(token)) {
    localStorage.removeItem('hfa_token');
    window.location.href = '/login?expired_impersonation=1';
    return new Promise(() => {}); // prevent further execution
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body, isFormData) => request('POST', path, body, isFormData),
  put: (path, body, isFormData) => request('PUT', path, body, isFormData),
  delete: (path) => request('DELETE', path),

  /**
   * Upload a PDF (or image) to Supabase Storage via the backend.
   * @param {File}   file   - The File object from an <input type="file">
   * @param {string} folder - Storage folder, e.g. 'applications', 'proposals'
   * @returns {Promise<string>} public Supabase URL
   */
  uploadPdf: async (file, folder = 'general') => {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    const data = await request('POST', '/api/upload', form, true);
    return data.url;
  },
};

export default api;
