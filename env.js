// Environment-safe API base without a build step.
// Uses localhost API when running locally, otherwise uses production API.
window.PUBLIC_API_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000/api'
    : 'https://bike-guard-api.onrender.com/api';
