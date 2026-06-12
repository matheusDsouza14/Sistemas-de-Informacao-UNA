(function () {
  'use strict';

  const config = window.BarberConnectConfig || {};
  const DB_KEY = config.DB_KEY || 'barberconnect.localDatabase.v1';
  const USER_KEY = config.USER_KEY || 'barberconnect.user';
  const RETENTION_MS = 4 * 60 * 1000;

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function create(tag, className = '', text = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizedLower(value) {
    return normalizeText(value).toLowerCase();
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function readDb() {
    const db = readJson(DB_KEY, null);
    if (!db || typeof db !== 'object') return null;
    db.users = Array.isArray(db.users) ? db.users : [];
    db.barbershops = Array.isArray(db.barbershops) ? db.barbershops : [];
    db.barbers = Array.isArray(db.barbers) ? db.barbers : [];
    db.services = Array.isArray(db.services) ? db.services : [];
    db.appointments = Array.isArray(db.appointments) ? db.appointments : [];
    return db;
  }

  function getCurrentUser() {
    return readJson(USER_KEY, null);
  }

  function numberValue(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function findService(db, appointment) {
    const serviceId = numberValue(appointment.serviceId || appointment.service?.id);
    if (serviceId) {
      const byId = db.services.find((service) => Number(service.id) === serviceId);
      if (byId) return byId;
    }

    const serviceName = normalizedLower(appointment.serviceName || appointment.service?.name || appointment.servico || appointment.serviço);
    if (serviceName) {
      return db.services.find((service) => normalizedLower(service.name) === serviceName) || null;
    }

    return null;
  }

  function findBarber(db, appointment) {
    const barberId = numberValue(appointment.barberId || appointment.barber?.id || appointment.professionalId || appointment.profissionalId);
    if (barberId) {
      const byId = db.barbers.find((barber) => Number(barber.id) === barberId);
      if (byId) return byId;
    }

    const barberName = normalizedLower(appointment.barberName || appointment.professionalName || appointment.profissional || appointment.barber?.name);
    if (barberName) {
      return db.barbers.find((barber) => normalizedLower(barber.name) === barberName) || null;
    }

    return null;
  }

  function findShopById(db, id) {
    const shopId = numberValue(id);
    if (!shopId) return null;
    return db.barbershops.find((shop) => Number(shop.id) === shopId) || null;
  }

  function resolveShop(db, appointment) {
    const directName = [
      appointment.barbershopName,
      appointment.shopName,
      appointment.businessName,
      appointment.companyName,
      appointment.establishmentName,
      appointment.placeName,
      appointment.localName,
      appointment.local,
      appointment.location,
      appointment.barbershop?.name,
      appointment.shop?.name,
      appointment.service?.barbershop?.name,
      appointment.service?.shop?.name
    ].map(normalizeText).find((value) => value && normalizedLower(value) !== 'barbearia não informada');

    const service = findService(db, appointment);
    const barber = findBarber(db, appointment);
    const possibleIds = [
      appointment.barbershopId,
      appointment.shopId,
      appointment.shop_id,
      appointment.establishmentId,
      appointment.estabelecimentoId,
      appointment.placeId,
      appointment.locationId,
      appointment.barbershop?.id,
      appointment.shop?.id,
      appointment.service?.barbershopId,
      appointment.service?.barbershop?.id,
      appointment.service?.shop?.id,
      appointment.barber?.barbershopId,
      service?.barbershopId,
      barber?.barbershopId
    ];

    let shop = null;
    for (const id of possibleIds) {
      shop = findShopById(db, id);
      if (shop) break;
    }

    if (!shop && directName) {
      shop = db.barbershops.find((item) => normalizedLower(item.name) === normalizedLower(directName)) || null;
    }

    const name = directName || normalizeText(shop?.name) || 'Barbearia não informada';
    const id = numberValue(shop?.id) || numberValue(possibleIds.find(numberValue)) || null;

    return {
      id,
      name,
      address: normalizeText(shop?.address || appointment.barbershop?.address || appointment.service?.barbershop?.address),
      service,
      barber
    };
  }

  function cleanExpiredCanceledAppointments(db) {
    const now = Date.now();
    const originalLength = db.appointments.length;
    db.appointments = db.appointments.filter((appointment) => {
      const isCanceled = normalizedLower(appointment.status) === 'cancelado';
      if (!isCanceled) return true;
      const removeAfter = new Date(appointment.removeAfter || appointment.canceledAt || 0).getTime();
      const removalTime = appointment.removeAfter ? removeAfter : removeAfter + RETENTION_MS;
      return Number.isFinite(removalTime) && removalTime > now;
    });
    return db.appointments.length !== originalLength;
  }

  function migrateAppointmentNames(db) {
    let changed = false;
    db.appointments.forEach((appointment) => {
      const shop = resolveShop(db, appointment);
      if (shop.name && shop.name !== 'Barbearia não informada') {
        if (appointment.barbershopName !== shop.name) {
          appointment.barbershopName = shop.name;
          changed = true;
        }
        if (appointment.local !== shop.name) {
          appointment.local = shop.name;
          changed = true;
        }
      }
      if (shop.id && Number(appointment.barbershopId) !== Number(shop.id)) {
        appointment.barbershopId = shop.id;
        changed = true;
      }
    });
    return changed;
  }

  function formatCurrency(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
  }

  function formatDateTime(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function belongsToUser(appointment, user) {
    if (!user) return true;
    if (appointment.userId == null && appointment.user?.id == null && !appointment.userEmail) return true;
    return Number(appointment.userId || appointment.user?.id) === Number(user.id) || normalizedLower(appointment.userEmail) === normalizedLower(user.email);
  }

  function renderMessage(list, text) {
    list.innerHTML = '';
    list.appendChild(create('p', 'empty-state', text));
  }

  function cancelAppointmentDirect(db, appointmentId) {
    const appointment = db.appointments.find((item) => Number(item.id) === Number(appointmentId));
    if (!appointment) return false;

    const now = Date.now();
    appointment.status = 'Cancelado';
    appointment.canceledAt = new Date(now).toISOString();
    appointment.removeAfter = new Date(now + RETENTION_MS).toISOString();
    writeDb(db);
    return true;
  }

  function renderAppointmentsFromDb() {
    const list = $('.appointments-list');
    if (!list || document.body.dataset.page !== 'appointments') return;

    const db = readDb();
    const user = getCurrentUser();
    if (!db) {
      renderMessage(list, 'Banco local não encontrado. Faça login e crie um agendamento novamente.');
      return;
    }

    const changedByCleanup = cleanExpiredCanceledAppointments(db);
    const changedByMigration = migrateAppointmentNames(db);
    if (changedByCleanup || changedByMigration) writeDb(db);

    const appointments = db.appointments.filter((appointment) => belongsToUser(appointment, user));
    list.innerHTML = '';

    if (!appointments.length) {
      renderMessage(list, 'Você ainda não possui agendamentos.');
      return;
    }

    appointments.forEach((appointment) => {
      const shop = resolveShop(db, appointment);
      const service = shop.service || appointment.service || {};
      const barber = shop.barber || appointment.barber || {};
      const row = create('article', `appointment-row ${normalizedLower(appointment.status) === 'cancelado' ? 'is-canceled' : ''}`);

      const barberCard = create('div', 'barber-card appointment-barber-summary');
      const img = document.createElement('img');
      img.src = barber.photoUrl || 'assets/barber-photo.svg';
      img.alt = `Foto de ${barber.name || appointment.barberName || 'barbeiro'}`;
      barberCard.append(img, create('span', '', barber.name || appointment.barberName || 'Nome do barbeiro'));

      const info = create('div', 'appointment-info');
      const text = create('div', 'appointment-details');
      text.innerHTML = `
        <p class="appointment-place"><strong>Barbearia:</strong> <span>${shop.name}</span></p>
        ${shop.address ? `<p><strong>Endereço:</strong> <span>${shop.address}</span></p>` : ''}
        <p><strong>Serviço:</strong> <span>${service.name || appointment.serviceName || 'Serviço'}</span></p>
        <p><strong>Preço:</strong> <span>${formatCurrency(service.price || appointment.price)}</span></p>
        <p><strong>Data do agendamento:</strong> <span>${formatDateTime(appointment.appointmentDateTime || appointment.dateTime || appointment.date)}</span></p>
        <p><strong>Status:</strong> <span>${appointment.status || 'Pendente'}</span></p>
      `;

      const actions = create('div', 'appointment-actions');
      if (normalizedLower(appointment.status) === 'cancelado') {
        actions.appendChild(create('span', 'status-pill status-canceled', 'Agendamento cancelado'));
      } else {
        const cancelButton = create('button', 'btn cancel-appointment-btn', 'Cancelar agendamento');
        cancelButton.type = 'button';
        cancelButton.addEventListener('click', async () => {
          if (!window.confirm('Deseja cancelar este agendamento?')) return;
          cancelButton.disabled = true;
          cancelButton.textContent = 'Cancelando...';
          try {
            if (window.BarberConnectApi && typeof window.BarberConnectApi.cancelAppointment === 'function') {
              await window.BarberConnectApi.cancelAppointment(appointment.id);
            } else {
              cancelAppointmentDirect(db, appointment.id);
            }
          } catch (_error) {
            cancelAppointmentDirect(readDb() || db, appointment.id);
          }
          renderAppointmentsFromDb();
        });
        actions.appendChild(cancelButton);
      }

      info.append(text, actions);
      row.append(barberCard, info);
      list.appendChild(row);
    });
  }

  function boot() {
    renderAppointmentsFromDb();
    window.setTimeout(renderAppointmentsFromDb, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
