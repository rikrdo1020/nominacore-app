// Backend API URL configuration
// During local development, set VALENTINI_API_URL env var or it defaults to localhost
const BACKEND_URL = process.env.VALENTINI_API_URL || 'https://nominacore-api.onrender.com/api';

module.exports = { BACKEND_URL };
