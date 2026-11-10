export const backendEnabled = process.env.REACT_APP_ENABLE_BACKEND === 'true';
export const apiBase = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
