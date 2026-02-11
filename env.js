// API base for frontend requests.
// Default: same-origin `/api` (works for Vercel fullstack and local Node server).
// Optional override: set `window.PUBLIC_API_URL` before this script loads.
window.PUBLIC_API_URL =
  window.PUBLIC_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : '/api')
