(function () {
  'use strict';

  const config = window.BarberConnectConfig || {};
  const DB_KEY = config.DB_KEY || 'barberconnect.localDatabase.v1';
  const ACCESS_TOKEN_KEY = config.ACCESS_TOKEN_KEY || 'barberconnect.accessToken';
  const REFRESH_TOKEN_KEY = config.REFRESH_TOKEN_KEY || 'barberconnect.refreshToken';
  const USER_KEY = config.USER_KEY || 'barberconnect.user';
  const CANCELED_APPOINTMENT_RETENTION_MS = Number(config.CANCELED_APPOINTMENT_RETENTION_MS) || 4 * 60 * 1000;

  const DEFAULT_SHOPS = [
    { id: 1, name: 'Barbearia Central', cnpj: '00.000.000/0001-01', address: 'Rua Principal, 100', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 2, name: 'Corte Fino', cnpj: '00.000.000/0001-02', address: 'Av. Brasil, 220', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 3, name: 'Barber Prime', cnpj: '00.000.000/0001-03', address: 'Rua das Flores, 45', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 4, name: 'Navalha Club', cnpj: '00.000.000/0001-04', address: 'Rua do Comércio, 88', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 5, name: 'Estilo Barber', cnpj: '00.000.000/0001-05', address: 'Av. Paulista, 35', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 6, name: 'Studio da Barba', cnpj: '00.000.000/0001-06', address: 'Rua Minas, 70', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 7, name: 'Barbearia Imperial', cnpj: '00.000.000/0001-07', address: 'Praça Central, 12', photoUrl: 'assets/barbershop-logo.svg' },
    { id: 8, name: 'Master Barber', cnpj: '00.000.000/0001-08', address: 'Rua Norte, 400', photoUrl: 'assets/barbershop-logo.svg' }
  ];

  const BARBER_NAMES = ['João Oliveira', 'Carlos Santos', 'Rafael Lima'];
  const SERVICE_NAMES = [
    { name: 'Corte', price: 45 },
    { name: 'Barba', price: 35 },
    { name: 'Sombrancelha', price: 25 },
    { name: 'Hidratação', price: 60 },
    { name: 'Relaxamento', price: 70 }
  ];

  function createInitialDatabase() {
    const db = {
      nextIds: {
        user: 1,
        barbershop: DEFAULT_SHOPS.length + 1,
        barber: 1,
        service: 1,
        appointment: 1
      },
      users: [],
      barbershops: [],
      barbers: [],
      services: [],
      appointments: [],
      sessions: [],
      passwordResetCodes: {}
    };

    DEFAULT_SHOPS.forEach((shop) => {
      db.barbershops.push({
        ...shop,
        phone: '(31) 99999-0000',
        businessHours: 'Segunda a sábado, 09:00 às 19:00',
        latitude: 0,
        longitude: 0,
        ownerUserId: null
      });

      const barberIds = BARBER_NAMES.map((barberName) => {
        const barber = {
          id: db.nextIds.barber,
          barbershopId: shop.id,
          name: barberName,
          photoUrl: 'assets/barber-photo.svg'
        };
        db.nextIds.barber += 1;
        db.barbers.push(barber);
        return barber.id;
      });

      SERVICE_NAMES.forEach((service) => {
        db.services.push({
          id: db.nextIds.service,
          barbershopId: shop.id,
          name: service.name,
          price: service.price,
          barberIds: [...barberIds]
        });
        db.nextIds.service += 1;
      });
    });

    return db;
  }

  function isCanceledStatus(appointment) {
    return String(appointment?.status || '').toLowerCase() === 'cancelado';
  }

  function getCanceledAppointmentRemovalTime(appointment) {
    if (!isCanceledStatus(appointment)) {
      return null;
    }

    const explicitRemovalTime = new Date(appointment?.removeAfter || '').getTime();
    if (!Number.isNaN(explicitRemovalTime)) {
      return explicitRemovalTime;
    }

    const canceledTime = new Date(appointment?.canceledAt || '').getTime();
    if (Number.isNaN(canceledTime)) {
      return null;
    }

    return canceledTime + CANCELED_APPOINTMENT_RETENTION_MS;
  }

  function removeExpiredCanceledAppointments(db, now = Date.now()) {
    if (!Array.isArray(db.appointments)) {
      return false;
    }

    const originalLength = db.appointments.length;
    db.appointments = db.appointments.filter((appointment) => {
      const removalTime = getCanceledAppointmentRemovalTime(appointment);
      return removalTime === null || removalTime > now;
    });

    return db.appointments.length !== originalLength;
  }

  function getCanceledAppointmentRemovalInfo(appointment) {
    const removalTime = getCanceledAppointmentRemovalTime(appointment);

    if (removalTime === null) {
      return { removeAfter: null, remainingMs: null };
    }

    return {
      removeAfter: new Date(removalTime).toISOString(),
      remainingMs: Math.max(0, removalTime - Date.now())
    };
  }

  function readDatabase() {
    try {
      const savedDatabase = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
      if (savedDatabase && Array.isArray(savedDatabase.users)) {
        const db = normalizeDatabase(savedDatabase);
        removeExpiredCanceledAppointments(db);
        writeDatabase(db);
        return db;
      }
    } catch (_error) {
      // Se o banco local estiver corrompido, recriamos a estrutura.
    }

    const db = createInitialDatabase();
    writeDatabase(db);
    return db;
  }

  function normalizeDatabase(db) {
    const freshDatabase = createInitialDatabase();

    db.nextIds = db.nextIds || freshDatabase.nextIds;
    db.users = Array.isArray(db.users) ? db.users : [];
    db.barbershops = Array.isArray(db.barbershops) && db.barbershops.length ? db.barbershops : freshDatabase.barbershops;
    db.barbers = Array.isArray(db.barbers) && db.barbers.length ? db.barbers : freshDatabase.barbers;
    db.services = Array.isArray(db.services) && db.services.length ? db.services : freshDatabase.services;
    db.appointments = Array.isArray(db.appointments) ? db.appointments : [];
    db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
    db.passwordResetCodes = db.passwordResetCodes || {};

    db.appointments = db.appointments.map((appointment) => {
      const service = db.services.find((item) => Number(item.id) === Number(appointment.serviceId)) || null;
      const barber = db.barbers.find((item) => Number(item.id) === Number(appointment.barberId)) || null;
      const resolvedShop = resolveAppointmentBarbershop(db, appointment, barber, service);

      return {
        ...appointment,
        barbershopId: resolvedShop.id,
        barbershopName: resolvedShop.name,
        local: resolvedShop.name
      };
    });

    db.nextIds.user = Math.max(db.nextIds.user || 1, maxId(db.users) + 1);
    db.nextIds.barbershop = Math.max(db.nextIds.barbershop || 1, maxId(db.barbershops) + 1);
    db.nextIds.barber = Math.max(db.nextIds.barber || 1, maxId(db.barbers) + 1);
    db.nextIds.service = Math.max(db.nextIds.service || 1, maxId(db.services) + 1);
    db.nextIds.appointment = Math.max(db.nextIds.appointment || 1, maxId(db.appointments) + 1);

    return db;
  }

  function writeDatabase(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function maxId(items) {
    return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  }

  function publicUser(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function isValidEmail(email) {
    const normalizedEmail = String(email || '').trim();
    return normalizedEmail.includes('@') && !/\s/.test(normalizedEmail);
  }

  function getPasswordValidationMessage(password) {
    const value = String(password || '');
    const missingRules = [];

    if (value.length < 8) {
      missingRules.push('pelo menos 8 caracteres');
    }

    if (!/[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]/.test(value)) {
      missingRules.push('uma letra maiúscula');
    }

    if (!/\d/.test(value)) {
      missingRules.push('um número');
    }

    if (!/[^A-Za-z0-9ÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇáàâãéèêíïóôõöúç]/.test(value)) {
      missingRules.push('um caractere especial');
    }

    if (!missingRules.length) {
      return '';
    }

    return `A senha deve conter ${missingRules.join(', ')}.`;
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function createError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  function createToken(prefix) {
    const randomBytes = new Uint8Array(24);

    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < randomBytes.length; i += 1) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    const randomText = Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    return `${prefix}.${Date.now()}.${randomText}`;
  }

  async function hashPassword(password) {
    const normalizedPassword = String(password || '');
    const saltedPassword = `barberconnect-local-demo:${normalizedPassword}`;

    if (window.crypto?.subtle && window.TextEncoder) {
      const data = new TextEncoder().encode(saltedPassword);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return `sha256:${hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    }

    return `demo:${btoa(unescape(encodeURIComponent(saltedPassword))).split('').reverse().join('')}`;
  }

  function getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  function setAuth(authResponse) {
    if (!authResponse || !authResponse.accessToken || !authResponse.refreshToken) {
      throw new Error('Resposta de autenticação inválida.');
    }

    localStorage.setItem(ACCESS_TOKEN_KEY, authResponse.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, authResponse.refreshToken);

    if (authResponse.user) {
      setCurrentUser(authResponse.user);
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(publicUser(user)));
    }
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch (_error) {
      return null;
    }
  }

  function findSessionByAccessToken(db, token = getAccessToken()) {
    if (!token) return null;
    return db.sessions.find((session) => session.accessToken === token) || null;
  }

  function getAuthenticatedUser(db) {
    const session = findSessionByAccessToken(db);
    if (!session) return null;
    return db.users.find((user) => user.id === session.userId) || null;
  }

  function clearAuth() {
    const db = readDatabase();
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    db.sessions = db.sessions.filter((session) => (
      session.accessToken !== accessToken && session.refreshToken !== refreshToken
    ));

    writeDatabase(db);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function redirectToLogin() {
    const currentPage = `${window.location.pathname.split('/').pop() || 'index.html'}${window.location.search || ''}`;
    window.location.href = `login.html?redirect=${encodeURIComponent(currentPage)}`;
  }

  async function requireAuth() {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      clearAuth();
      redirectToLogin();
      throw createError(401, 'Usuário não autenticado. Faça login para continuar.');
    }

    setCurrentUser(user);
    return publicUser(user);
  }

  async function logout() {
    clearAuth();
    window.location.href = 'login.html';
  }

  async function registerUser(payload) {
    const db = readDatabase();
    const name = String(payload?.name || '').trim();
    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password || '');
    const cpf = onlyDigits(payload?.cpf).slice(0, 11);
    const birthDate = String(payload?.birthDate || '').trim();

    if (!name || !email || !password) {
      throw createError(400, 'Preencha nome, e-mail e senha para cadastrar.');
    }

    if (!isValidEmail(email)) {
      throw createError(400, 'Email inválido');
    }

    if (cpf.length !== 11) {
      throw createError(400, 'Informe um CPF com 11 números.');
    }

    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      throw createError(400, passwordError);
    }

    if (db.users.some((user) => user.email === email)) {
      throw createError(409, 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
    }

    const user = {
      id: db.nextIds.user,
      name,
      email,
      cpf,
      birthDate,
      role: 'CUSTOMER',
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    };

    db.nextIds.user += 1;
    db.users.push(user);
    writeDatabase(db);

    return publicUser(user);
  }

  async function login(payload) {
    const db = readDatabase();
    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password || '');
    const user = db.users.find((item) => item.email === email);
    const passwordHash = await hashPassword(password);

    if (!user || user.passwordHash !== passwordHash) {
      throw createError(401, 'Usuário não cadastrado ou senha incorreta.');
    }

    const session = {
      userId: user.id,
      accessToken: createToken('access'),
      refreshToken: createToken('refresh'),
      createdAt: new Date().toISOString()
    };

    db.sessions = db.sessions.filter((item) => item.userId !== user.id);
    db.sessions.push(session);
    writeDatabase(db);

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: publicUser(user)
    };
  }

  async function me() {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Sessão expirada. Faça login novamente.');
    }

    setCurrentUser(user);
    return publicUser(user);
  }

  async function forgotPassword(payload) {
    const db = readDatabase();
    const email = normalizeEmail(payload?.email);
    const user = db.users.find((item) => item.email === email);

    if (!user) {
      throw createError(404, 'Usuário não cadastrado.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.passwordResetCodes[email] = {
      code,
      expiresAt: Date.now() + 15 * 60 * 1000
    };
    writeDatabase(db);

    return { code };
  }

  async function resetPassword(payload) {
    const db = readDatabase();
    const email = normalizeEmail(payload?.email);
    const code = String(payload?.code || '').trim();
    const newPassword = String(payload?.newPassword || '');
    const user = db.users.find((item) => item.email === email);
    const storedCode = db.passwordResetCodes[email];

    if (!user) {
      throw createError(404, 'Usuário não cadastrado.');
    }

    if (!storedCode || storedCode.code !== code || storedCode.expiresAt < Date.now()) {
      throw createError(400, 'Código inválido ou expirado.');
    }

    const passwordError = getPasswordValidationMessage(newPassword);
    if (passwordError) {
      throw createError(400, passwordError);
    }

    user.passwordHash = await hashPassword(newPassword);
    delete db.passwordResetCodes[email];
    db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    writeDatabase(db);
    clearAuth();

    return true;
  }

  async function verifyEmail(payload) {
    const db = readDatabase();
    const email = normalizeEmail(payload?.email);
    const user = db.users.find((item) => item.email === email);

    if (!user) {
      throw createError(404, 'Usuário não cadastrado.');
    }

    return true;
  }

  async function resendVerificationCode(payload) {
    return verifyEmail(payload);
  }

  async function listBarbershops() {
    const db = readDatabase();
    return db.barbershops.map((shop) => ({ ...shop }));
  }

  async function getBarbershop(id) {
    const db = readDatabase();
    const barbershopId = Number(id);
    const shop = db.barbershops.find((item) => Number(item.id) === barbershopId);

    if (!shop) {
      throw createError(404, 'Barbearia não encontrada.');
    }

    return { ...shop };
  }

  async function createBarbershop(payload) {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Faça login para cadastrar uma barbearia.');
    }

    const name = String(payload?.name || '').trim();
    const cnpj = String(payload?.cnpj || '').trim();
    const address = String(payload?.address || '').trim();

    if (!name || !cnpj || !address) {
      throw createError(400, 'Preencha nome, CNPJ e endereço da barbearia.');
    }

    const shop = {
      id: db.nextIds.barbershop,
      name,
      cnpj,
      phone: payload?.phone || '',
      address,
      businessHours: payload?.businessHours || 'Segunda a sábado, 09:00 às 19:00',
      photoUrl: payload?.photoUrl || 'assets/barbershop-logo.svg',
      latitude: Number(payload?.latitude || 0),
      longitude: Number(payload?.longitude || 0),
      ownerUserId: user.id,
      createdAt: new Date().toISOString()
    };

    db.nextIds.barbershop += 1;
    db.barbershops.push(shop);

    const barberIds = ['Barbeiro 1', 'Barbeiro 2', 'Barbeiro 3'].map((barberName) => {
      const barber = {
        id: db.nextIds.barber,
        barbershopId: shop.id,
        name: barberName,
        photoUrl: 'assets/barber-photo.svg'
      };
      db.nextIds.barber += 1;
      db.barbers.push(barber);
      return barber.id;
    });

    SERVICE_NAMES.forEach((service) => {
      db.services.push({
        id: db.nextIds.service,
        barbershopId: shop.id,
        name: service.name,
        price: service.price,
        barberIds: [...barberIds]
      });
      db.nextIds.service += 1;
    });

    writeDatabase(db);
    return { ...shop };
  }

  async function listBarbershopBarbers(barbershopId) {
    const db = readDatabase();
    const id = Number(barbershopId);
    return db.barbers.filter((barber) => Number(barber.barbershopId) === id).map((barber) => ({ ...barber }));
  }

  async function getBarbershopBarber(barbershopId, barberId) {
    const barbers = await listBarbershopBarbers(barbershopId);
    const barber = barbers.find((item) => Number(item.id) === Number(barberId));

    if (!barber) {
      throw createError(404, 'Barbeiro não encontrado.');
    }

    return barber;
  }

  async function listBarbershopServices(barbershopId) {
    const db = readDatabase();
    const id = Number(barbershopId);
    return db.services.filter((service) => Number(service.barbershopId) === id).map((service) => ({ ...service }));
  }

  async function listBarberServices(barberId) {
    const db = readDatabase();
    const id = Number(barberId);
    return db.services.filter((service) => service.barberIds.includes(id)).map((service) => ({ ...service }));
  }

  function resolveAppointmentBarbershop(db, appointment, barber, service) {
    const nestedBarbershop = appointment?.barbershop || appointment?.service?.barbershop || null;
    const possibleId = Number(
      appointment?.barbershopId ||
      appointment?.shopId ||
      appointment?.shop_id ||
      appointment?.establishmentId ||
      appointment?.estabelecimentoId ||
      appointment?.placeId ||
      appointment?.locationId ||
      nestedBarbershop?.id ||
      appointment?.service?.barbershopId ||
      appointment?.barber?.barbershopId ||
      service?.barbershopId ||
      barber?.barbershopId ||
      0
    );

    const barbershop = db.barbershops.find((item) => Number(item.id) === possibleId) || null;
    const nameCandidates = [
      appointment?.barbershopName,
      appointment?.shopName,
      appointment?.businessName,
      appointment?.companyName,
      appointment?.establishmentName,
      appointment?.placeName,
      appointment?.localName,
      appointment?.local,
      appointment?.location,
      appointment?.barbershop?.name,
      appointment?.shop?.name,
      appointment?.service?.barbershop?.name,
      appointment?.service?.shop?.name,
      barbershop?.name
    ];

    const barbershopName = nameCandidates
      .map((value) => String(value || '').trim())
      .find((value) => value && value.toLowerCase() !== 'barbearia não informada') ||
      'Barbearia não informada';

    return {
      id: possibleId || barbershop?.id || null,
      name: barbershopName,
      data: barbershop ? { ...barbershop, name: barbershopName } : { id: possibleId || null, name: barbershopName }
    };
  }

  function buildAppointmentView(db, appointment) {
    const barber = db.barbers.find((item) => Number(item.id) === Number(appointment.barberId)) || null;
    const service = db.services.find((item) => Number(item.id) === Number(appointment.serviceId)) || null;
    const resolvedShop = resolveAppointmentBarbershop(db, appointment, barber, service);
    const safeBarbershop = resolvedShop.data;

    return {
      ...appointment,
      barbershopId: resolvedShop.id,
      barbershopName: resolvedShop.name,
      local: resolvedShop.name,
      barbershop: safeBarbershop,
      barber: barber ? { ...barber } : (appointment.barber ? { ...appointment.barber } : null),
      service: service ? { ...service, barbershop: safeBarbershop } : (appointment.service ? { ...appointment.service, barbershop: safeBarbershop } : null)
    };
  }

  function normalizeAppointmentDateTime(value) {
    const date = new Date(value || '');

    if (Number.isNaN(date.getTime())) {
      throw createError(400, 'Escolha uma data e um horário válidos.');
    }

    if (date.getTime() < Date.now()) {
      throw createError(400, 'Não é possível agendar em data ou horário anteriores ao atual.');
    }

    return date.toISOString();
  }

  function isActiveAppointment(appointment) {
    return String(appointment?.status || '').toLowerCase() !== 'cancelado';
  }

  function hasAppointmentConflict(db, barberId, appointmentIso, ignoredAppointmentId = null) {
    const appointmentDate = new Date(appointmentIso);

    return db.appointments.some((appointment) => {
      if (!isActiveAppointment(appointment)) return false;
      if (Number(appointment.id) === Number(ignoredAppointmentId)) return false;
      if (Number(appointment.barberId) !== Number(barberId)) return false;

      const existingDate = new Date(appointment.appointmentDateTime);
      return !Number.isNaN(existingDate.getTime()) && existingDate.getTime() === appointmentDate.getTime();
    });
  }

  async function createAppointment(payload) {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Faça login para agendar.');
    }

    const barberId = Number(payload?.barberId);
    const serviceId = Number(payload?.serviceId);
    const requestedBarbershopId = Number(payload?.barbershopId || payload?.shopId || payload?.establishmentId || 0);
    const barber = db.barbers.find((item) => Number(item.id) === barberId);
    const service = db.services.find((item) => Number(item.id) === serviceId);

    if (!barber || !service) {
      throw createError(400, 'Escolha um barbeiro e um serviço válidos.');
    }

    const appointmentDateTime = normalizeAppointmentDateTime(payload?.appointmentDateTime);

    if (hasAppointmentConflict(db, barberId, appointmentDateTime)) {
      throw createError(409, 'Horário indisponível para este barbeiro. Escolha outro dia ou horário.');
    }

    const resolvedBarbershopId = requestedBarbershopId || service.barbershopId || barber.barbershopId;
    const barbershop = db.barbershops.find((item) => Number(item.id) === Number(resolvedBarbershopId)) || null;
    const barbershopName = barbershop?.name || payload?.barbershopName || payload?.local || 'Barbearia não informada';

    const appointment = {
      id: db.nextIds.appointment,
      userId: user.id,
      barbershopId: resolvedBarbershopId,
      barbershopName,
      local: barbershopName,
      barberId,
      serviceId,
      appointmentDateTime,
      observation: payload?.observation || '',
      status: 'Confirmado',
      createdAt: new Date().toISOString()
    };

    db.nextIds.appointment += 1;
    db.appointments.push(appointment);
    writeDatabase(db);

    return buildAppointmentView(db, appointment);
  }

  async function listMyAppointments() {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Faça login para ver seus agendamentos.');
    }

    return db.appointments
      .filter((appointment) => appointment.userId === user.id)
      .map((appointment) => buildAppointmentView(db, appointment));
  }

  async function listBarberAppointments(barberId) {
    const db = readDatabase();
    const id = Number(barberId);

    return db.appointments
      .filter((appointment) => Number(appointment.barberId) === id && isActiveAppointment(appointment))
      .map((appointment) => buildAppointmentView(db, appointment));
  }

  async function cancelAppointment(appointmentId) {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Faça login para cancelar agendamentos.');
    }

    const appointment = db.appointments.find((item) => Number(item.id) === Number(appointmentId));

    if (!appointment || appointment.userId !== user.id) {
      throw createError(404, 'Agendamento não encontrado.');
    }

    if (!isActiveAppointment(appointment)) {
      throw createError(400, 'Este agendamento já está cancelado.');
    }

    const canceledAt = Date.now();
    appointment.status = 'Cancelado';
    appointment.canceledAt = new Date(canceledAt).toISOString();
    appointment.removeAfter = new Date(canceledAt + CANCELED_APPOINTMENT_RETENTION_MS).toISOString();
    writeDatabase(db);

    return buildAppointmentView(db, appointment);
  }

  function validateBirthDateIso(value) {
    const birthDate = String(value || '').trim();

    if (!birthDate) {
      return '';
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const isValidDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    const isFutureDate = date.getTime() > Date.now();

    if (!isValidDate || isFutureDate) {
      throw createError(400, 'Informe uma data de nascimento válida no formato DD/MM/AAAA.');
    }

    return birthDate;
  }

  async function updateCurrentUser(payload) {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Faça login para editar seu perfil.');
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'name')) {
      const name = String(payload?.name || '').trim();
      if (!name) {
        throw createError(400, 'Informe um nome válido.');
      }
      updates.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'email')) {
      const email = normalizeEmail(payload?.email);
      if (!isValidEmail(email)) {
        throw createError(400, 'Email inválido');
      }

      const emailAlreadyUsed = db.users.some((item) => item.id !== user.id && item.email === email);
      if (emailAlreadyUsed) {
        throw createError(409, 'Este e-mail já está cadastrado. Use outro e-mail.');
      }

      updates.email = email;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'cpf')) {
      const cpf = onlyDigits(payload?.cpf).slice(0, 11);
      if (cpf.length !== 11) {
        throw createError(400, 'Informe um CPF com 11 números.');
      }
      updates.cpf = cpf;
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'birthDate')) {
      updates.birthDate = validateBirthDateIso(payload?.birthDate);
    }

    if (Object.prototype.hasOwnProperty.call(payload || {}, 'profilePhotoUrl')) {
      updates.profilePhotoUrl = String(payload?.profilePhotoUrl || '').trim() || 'assets/profile-photo.svg';
    }

    Object.assign(user, updates, { updatedAt: new Date().toISOString() });
    writeDatabase(db);
    setCurrentUser(user);

    return publicUser(user);
  }

  async function updateCurrentPassword(payload) {
    const db = readDatabase();
    const user = getAuthenticatedUser(db);

    if (!user) {
      throw createError(401, 'Faça login para editar sua senha.');
    }

    const currentPassword = String(payload?.currentPassword || '');
    const newPassword = String(payload?.newPassword || '');
    const currentHash = await hashPassword(currentPassword);

    if (!currentPassword || user.passwordHash !== currentHash) {
      throw createError(401, 'Senha atual incorreta.');
    }

    const passwordError = getPasswordValidationMessage(newPassword);
    if (passwordError) {
      throw createError(400, passwordError);
    }

    user.passwordHash = await hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();
    // Mantém a sessão atual ativa depois da troca de senha no protótipo local.
    writeDatabase(db);
    setCurrentUser(user);

    return true;
  }

  async function request() {
    throw createError(400, 'Este projeto está usando banco local no navegador, sem conexão com API externa.');
  }

  // Garante que o banco exista assim que o script carregar.
  readDatabase();

  window.BarberConnectApi = {
    getAccessToken,
    getRefreshToken,
    getCurrentUser,
    setAuth,
    setCurrentUser,
    clearAuth,
    request,
    requireAuth,
    logout,
    registerUser,
    verifyEmail,
    resendVerificationCode,
    login,
    forgotPassword,
    resetPassword,
    me,
    listBarbershops,
    getBarbershop,
    createBarbershop,
    listBarbershopBarbers,
    getBarbershopBarber,
    listBarbershopServices,
    listBarberServices,
    createAppointment,
    listMyAppointments,
    listBarberAppointments,
    cancelAppointment,
    getCanceledAppointmentRemovalInfo,
    updateCurrentUser,
    updateCurrentPassword,
    resetLocalDatabase: () => {
      localStorage.removeItem(DB_KEY);
      clearAuth();
      readDatabase();
    }
  };
})();
