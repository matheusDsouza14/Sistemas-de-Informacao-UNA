// Configuração central do BarberConnect.
// A autenticação agora usa um banco local no navegador com localStorage.
window.BarberConnectConfig = {
  DB_KEY: 'barberconnect.localDatabase.v1',
  ACCESS_TOKEN_KEY: 'barberconnect.accessToken',
  REFRESH_TOKEN_KEY: 'barberconnect.refreshToken',
  USER_KEY: 'barberconnect.user',
  PENDING_EMAIL_KEY: 'barberconnect.pendingEmail',
  LAST_APPOINTMENT_KEY: 'barberconnect.lastAppointmentId'
};
