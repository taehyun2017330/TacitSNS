// API Configuration
// Switch between local and production backend by changing USE_LOCAL

const USE_LOCAL = false; // Set to true for local development, false for production

export const API_BASE_URL = USE_LOCAL
  ? 'http://localhost:8000'
  : 'https://3.105.248.214'; // Production uses HTTPS on default port 443

export const config = {
  apiBaseUrl: API_BASE_URL,
  useLocal: USE_LOCAL
};
