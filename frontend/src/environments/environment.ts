export const environment = {
  production: false,
  apiUrl: (typeof window !== 'undefined' && window.location.port === '4200')
    ? 'http://localhost:5115/api/v1'
    : '/api/v1'
};
