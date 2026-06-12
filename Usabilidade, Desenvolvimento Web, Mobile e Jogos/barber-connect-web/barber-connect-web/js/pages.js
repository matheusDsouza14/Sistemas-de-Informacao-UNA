(function () {
  'use strict';

  const api = window.BarberConnectApi;
  const config = window.BarberConnectConfig || {};
  const LAST_APPOINTMENT_KEY = config.LAST_APPOINTMENT_KEY || 'barberconnect.lastAppointmentId';
  const PENDING_EMAIL_KEY = config.PENDING_EMAIL_KEY || 'barberconnect.pendingEmail';
  const fallbackImages = {
    logo: 'assets/barberconnect-logo-text.png',
    barbershop: 'assets/barbershop-logo.svg',
    barber: 'assets/barber-photo.svg',
    profile: 'assets/profile-photo.svg'
  };
  let appointmentsCleanupRefreshTimer = null;
  const HEADER_LOGO_SRC = 'assets/barberconnect-logo-text.png';

  function ensureHeaderLogo() {
    const header = document.querySelector('.header');
    if (!header) return;

    let logoLink = header.querySelector('.logo-ref');
    if (!logoLink) {
      logoLink = document.createElement('a');
      logoLink.className = 'logo-ref';
      header.insertBefore(logoLink, header.firstChild);
    }

    logoLink.href = 'home.html';
    logoLink.setAttribute('data-image-ref', HEADER_LOGO_SRC);
    logoLink.setAttribute('aria-label', 'Ir para a página inicial do BarberConnect');

    let logoImg = logoLink.querySelector('img.logo-img');
    if (!logoImg) {
      logoImg = document.createElement('img');
      logoImg.className = 'logo-img';
      logoLink.appendChild(logoImg);
    }

    logoImg.src = HEADER_LOGO_SRC;
    logoImg.alt = 'Logo BarberConnect';
    logoImg.loading = 'eager';
  }


  function $(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function $all(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function redirectAfterLogin() {
    const redirect = getQueryParam('redirect');
    return redirect || 'home.html';
  }

  function setMessage(element, text, type = 'info') {
    if (!element) return;

    element.textContent = text || '';
    element.classList.remove('is-error', 'is-success', 'is-info');
    element.classList.add(`is-${type}`);
  }

  function getFormMessage(form) {
    return $('.form-message', form) || $('.form-message');
  }

  function setLoading(form, loading) {
    if (!form) return;
    const button = $('button[type="submit"]', form);
    if (button) {
      button.disabled = loading;
      button.dataset.originalText = button.dataset.originalText || button.textContent;
      button.textContent = loading ? 'Aguarde...' : button.dataset.originalText;
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function getCpfDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 11);
  }

  function formatCpf(value) {
    const digits = getCpfDigits(value);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function allowOnlyDigits(event) {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ];

    if (allowedKeys.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key.length === 1 && !/\d/.test(event.key)) {
      event.preventDefault();
    }
  }

  function setupCpfField(form) {
    const cpfField = $('[name="cpf"]', form);
    if (!cpfField) return;

    cpfField.addEventListener('keydown', allowOnlyDigits);
    cpfField.addEventListener('input', () => {
      cpfField.value = formatCpf(cpfField.value);
    });

    cpfField.value = formatCpf(cpfField.value);
  }

  function getBirthDateDigits(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 8);
  }

  function formatBirthDate(value) {
    const digits = getBirthDateDigits(value);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 4) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }

  function birthDateToIso(value) {
    const digits = getBirthDateDigits(value);
    if (digits.length !== 8) return '';

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    const date = new Date(year, month - 1, day);

    const isValidDate = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    const isFutureDate = date.getTime() > Date.now();

    if (!isValidDate || isFutureDate) {
      return '';
    }

    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function setupBirthDateField(form) {
    const birthDateField = $('[name="birthDate"]', form);
    if (!birthDateField) return;

    birthDateField.addEventListener('keydown', allowOnlyDigits);
    birthDateField.addEventListener('input', () => {
      birthDateField.value = formatBirthDate(birthDateField.value);
    });

    birthDateField.value = formatBirthDate(birthDateField.value);
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

  function setupCarousels() {
    $all('.shop-carousel').forEach((carousel) => {
      const scroller = $('.shop-scroller', carousel);
      const previousButton = $('.carousel-prev', carousel);
      const nextButton = $('.carousel-next', carousel);

      if (!scroller || !previousButton || !nextButton) {
        return;
      }

      // Garante que a lista funcione como carrossel mesmo se algum CSS antigo ficar no cache.
      scroller.style.display = 'flex';
      scroller.style.flexWrap = 'nowrap';
      scroller.style.overflowX = 'auto';
      scroller.style.maxWidth = '100%';
      carousel.style.overflow = 'hidden';
      carousel.style.maxWidth = '100%';

      if (carousel.dataset.carouselReady === 'true') {
        return;
      }

      carousel.dataset.carouselReady = 'true';

      const scrollCarousel = (direction) => {
        const card = $('.shop-card', scroller);
        const cardWidth = card ? card.getBoundingClientRect().width : scroller.clientWidth * 0.75;
        const gap = parseFloat(getComputedStyle(scroller).gap || '0') || 0;
        const distance = Math.max(cardWidth + gap, scroller.clientWidth * 0.72);

        scroller.scrollBy({
          left: direction * distance,
          behavior: 'smooth'
        });
      };

      previousButton.addEventListener('click', () => scrollCarousel(-1));
      nextButton.addEventListener('click', () => scrollCarousel(1));
    });
  }

  function formatCurrency(value) {
    const number = Number(value || 0);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  }

  function formatDateTime(value) {
    if (!value) return 'Data não informada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date);
  }

  function startOfLocalDay(date) {
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    return localDate;
  }

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function toTimeInputValue(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  function createLocalDateTime(dateValue, timeValue) {
    const [year, month, day] = String(dateValue || '').split('-').map(Number);
    const [hour, minute] = String(timeValue || '00:00').split(':').map(Number);
    return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
  }

  function isAppointmentCanceled(appointment) {
    return String(appointment?.status || '').toLowerCase() === 'cancelado';
  }

  function isPastDate(date) {
    return startOfLocalDay(date).getTime() < startOfLocalDay(new Date()).getTime();
  }

  function isPastDateTime(dateValue, timeValue) {
    const date = createLocalDateTime(dateValue, timeValue);
    return Number.isNaN(date.getTime()) || date.getTime() < Date.now();
  }

  function appointmentMatchesSlot(appointment, dateValue, timeValue) {
    if (isAppointmentCanceled(appointment)) return false;

    const date = new Date(appointment?.appointmentDateTime || '');
    if (Number.isNaN(date.getTime())) return false;

    return toDateInputValue(date) === dateValue && toTimeInputValue(date) === timeValue;
  }

  function getCurrentMonthDates() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dates = [];

    for (let day = 1; day <= lastDay; day += 1) {
      dates.push(new Date(year, month, day));
    }

    return dates;
  }

  function setImage(img, src, fallback, alt) {
    if (!img) return;
    img.src = src || fallback;
    img.alt = alt || img.alt || '';
    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
    };
  }

  function renderHeaderNav() {
    const nav = $('.header-actions');
    if (!nav) return;

    const page = document.body.dataset.page || '';
    const authMode = document.body.dataset.auth || 'public';
    let html = '';

    if (authMode === 'protected') {
      html = `
        <a class="nav-button" href="home.html">Home</a>
        <a class="nav-button" href="appointments.html">Gerenciar agendamentos</a>
        <a class="nav-button" href="user.html">Perfil</a>
        <button class="nav-button nav-button-plain" type="button" id="logout-button">Sair</button>
      `;
    } else if (page === 'landing') {
      html = `
        <a class="nav-button" href="login.html">Login</a>
        <a class="nav-button" href="register-user.html">Cadastrar</a>
      `;
    } else if (page === 'login') {
      html = '<a class="nav-button" href="register-user.html">Cadastrar</a>';
    } else if (page === 'register-user') {
      html = '<a class="nav-button" href="login.html">Login</a>';
    } else {
      html = `
        <a class="nav-button" href="login.html">Login</a>
        <a class="nav-button" href="register-user.html">Cadastrar</a>
      `;
    }

    nav.innerHTML = html;
    const logoutButton = $('#logout-button');
    if (logoutButton && api?.logout) {
      logoutButton.addEventListener('click', api.logout);
    }
  }

  function renderProtectedNav() {
    renderHeaderNav();
  }

  function renderPageMessage(text, type = 'info') {
    const main = $('.main');
    if (!main) return;

    let message = $('.page-message', main);
    if (!message) {
      message = createElement('p', 'page-message');
      main.prepend(message);
    }

    setMessage(message, text, type);
  }

  function apiErrorText(error, fallback) {
    if (error.status === 401) {
      return 'Usuário não cadastrado ou senha incorreta.';
    }

    if (error.status === 403 && String(error.message || '').toLowerCase().includes('verified')) {
      return 'E-mail ainda não verificado. Verifique seu e-mail antes de fazer login.';
    }

    return error.message || fallback || 'Ocorreu um erro. Tente novamente.';
  }

  function setupLoginPage() {
    const form = $('#login-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(form);
      setMessage(message, '', 'info');
      setLoading(form, true);

      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || formData.get('senha') || '');

      try {
        const authResponse = await api.login({ email, password });
        api.setAuth(authResponse);
        const user = await api.me();
        api.setCurrentUser(user);
        setMessage(message, 'Login realizado com sucesso.', 'success');
        window.location.href = redirectAfterLogin();
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Não foi possível fazer login.'), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function setupUserRegisterPage() {
    const form = $('#register-user-form');
    if (!form) return;

    setupCpfField(form);
    setupBirthDateField(form);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(form);
      setMessage(message, '', 'info');
      setLoading(form, true);

      const formData = new FormData(form);
      const name = String(formData.get('name') || formData.get('nome') || '').trim();
      const cpf = getCpfDigits(formData.get('cpf'));
      const birthDate = birthDateToIso(formData.get('birthDate'));
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || formData.get('senha') || '');
      const confirmPassword = String(formData.get('confirmPassword') || formData.get('confirmar-senha') || '');

      if (cpf.length !== 11) {
        setMessage(message, 'Informe um CPF com 11 números.', 'error');
        setLoading(form, false);
        return;
      }

      if (!birthDate) {
        setMessage(message, 'Informe uma data de nascimento válida no formato DD/MM/AAAA.', 'error');
        setLoading(form, false);
        return;
      }

      if (!isValidEmail(email)) {
        setMessage(message, 'Email inválido', 'error');
        setLoading(form, false);
        return;
      }

      const passwordError = getPasswordValidationMessage(password);
      if (passwordError) {
        setMessage(message, passwordError, 'error');
        setLoading(form, false);
        return;
      }

      if (password !== confirmPassword) {
        setMessage(message, 'As senhas não conferem.', 'error');
        setLoading(form, false);
        return;
      }

      try {
        await api.registerUser({ name, cpf, birthDate, email, password });
        localStorage.setItem(PENDING_EMAIL_KEY, email);
        setMessage(message, 'Cadastro criado com sucesso. Faça login para entrar no sistema.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 900);
      } catch (error) {
        const alreadyExists = error.status === 409 ? 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.' : null;
        setMessage(message, alreadyExists || apiErrorText(error, 'Não foi possível cadastrar o usuário.'), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function setupVerifyEmailPage() {
    const form = $('#verify-email-form');
    if (!form) return;

    const emailField = $('[name="email"]', form);
    if (emailField && !emailField.value) {
      emailField.value = localStorage.getItem(PENDING_EMAIL_KEY) || '';
    }

    $('#resend-code-button')?.addEventListener('click', async () => {
      const email = String(emailField?.value || '').trim();
      const message = getFormMessage(form);
      if (!email) {
        setMessage(message, 'Informe o e-mail para reenviar o código.', 'error');
        return;
      }

      try {
        await api.resendVerificationCode({ email });
        setMessage(message, 'Cadastro encontrado. A verificação por e-mail não é necessária no modo local.', 'success');
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Não foi possível reenviar o código.'), 'error');
      }
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(form);
      setLoading(form, true);

      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim();
      const code = String(formData.get('code') || '').trim();

      try {
        await api.verifyEmail({ email, code });
        localStorage.removeItem(PENDING_EMAIL_KEY);
        setMessage(message, 'Cadastro encontrado. Você já pode fazer login.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 900);
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Código inválido ou expirado.'), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function setupResetPasswordPage() {
    const requestForm = $('#forgot-password-form');
    const resetForm = $('#reset-password-form');
    if (!requestForm || !resetForm) return;

    requestForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(requestForm);
      setLoading(requestForm, true);

      const email = String(new FormData(requestForm).get('email') || '').trim();

      try {
        const response = await api.forgotPassword({ email });
        $('[name="email"]', resetForm).value = email;
        resetForm.classList.remove('hidden');
        setMessage(message, `Código de recuperação gerado: ${response.code}`, 'success');
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Não foi possível solicitar o código.'), 'error');
      } finally {
        setLoading(requestForm, false);
      }
    });

    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(resetForm);
      setLoading(resetForm, true);

      const formData = new FormData(resetForm);
      const email = String(formData.get('email') || '').trim();
      const code = String(formData.get('code') || '').trim();
      const newPassword = String(formData.get('newPassword') || '');
      const confirmPassword = String(formData.get('confirmPassword') || '');

      if (newPassword !== confirmPassword) {
        setMessage(message, 'As senhas não conferem.', 'error');
        setLoading(resetForm, false);
        return;
      }

      try {
        await api.resetPassword({ email, code, newPassword });
        setMessage(message, 'Senha alterada. Faça login novamente.', 'success');
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 900);
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Não foi possível redefinir a senha.'), 'error');
      } finally {
        setLoading(resetForm, false);
      }
    });
  }

  function createShopCard(shop) {
    const article = createElement('article', 'shop-card');
    const title = createElement('h3', '', shop.name || 'Nome Barbearia');
    const link = createElement('a', 'image-ref shop-link');
    const imageRef = shop.photoUrl || fallbackImages.barbershop;

    link.href = `barbershop.html?id=${encodeURIComponent(shop.id)}`;
    link.setAttribute('aria-label', `Abrir página da barbearia ${shop.name || shop.id}`);
    link.dataset.imageRef = imageRef;

    const img = document.createElement('img');
    setImage(img, shop.photoUrl, fallbackImages.barbershop, `Logo da barbearia ${shop.name || shop.id}`);

    link.appendChild(img);
    article.append(title, link);

    return article;
  }

  function renderShopList(container, shops) {
    container.innerHTML = '';

    if (!shops.length) {
      container.appendChild(createElement('p', 'empty-state', 'Nenhuma barbearia cadastrada ainda.'));
      return;
    }

    shops.forEach((shop) => container.appendChild(createShopCard(shop)));
  }

  async function setupHomePage() {
    const containers = $all('.shop-scroller');
    if (!containers.length) return;

    try {
      const shops = await api.listBarbershops();
      containers.forEach((container) => renderShopList(container, Array.isArray(shops) ? shops : []));
      setupCarousels();
    } catch (error) {
      renderPageMessage(apiErrorText(error, 'Não foi possível carregar as barbearias.'), 'error');
      setupCarousels();
    }
  }

  function createBarberCard(barber, barbershopId) {
    const link = createElement('a', 'barber-card');
    link.href = `schedule.html?barbershopId=${encodeURIComponent(barbershopId)}&barberId=${encodeURIComponent(barber.id)}`;

    const img = document.createElement('img');
    setImage(img, fallbackImages.barber, fallbackImages.barber, `Foto de ${barber.name || 'barbeiro'}`);

    const span = createElement('span', '', barber.name || 'Nome do barbeiro');
    link.append(img, span);
    return link;
  }

  async function setupBarbershopPage() {
    const barbershopId = getQueryParam('id');
    if (!barbershopId) {
      renderPageMessage('Barbearia não encontrada: falta o parâmetro id na URL.', 'error');
      return;
    }

    try {
      const shop = await api.getBarbershop(barbershopId);
      const shopName = $('.shop-name');
      if (shopName) shopName.textContent = shop.name || 'Nome da barbearia';

      const shopLogo = $('.shop-hero img');
      const shopImageRef = $('.shop-hero .image-ref');
      const imageRef = shop.photoUrl || fallbackImages.barbershop;
      setImage(shopLogo, shop.photoUrl, fallbackImages.barbershop, `Logo da barbearia ${shop.name || ''}`);
      if (shopImageRef) {
        shopImageRef.href = imageRef;
        shopImageRef.dataset.imageRef = imageRef;
      }

      const barberList = $('.barber-list');
      const barbers = await api.listBarbershopBarbers(barbershopId);
      if (barberList) {
        barberList.innerHTML = '';
        if (!Array.isArray(barbers) || !barbers.length) {
          barberList.appendChild(createElement('p', 'empty-state', 'Nenhum barbeiro disponível nesta barbearia.'));
        } else {
          barbers.forEach((barber) => barberList.appendChild(createBarberCard(barber, barbershopId)));
        }
      }
    } catch (error) {
      renderPageMessage(apiErrorText(error, 'Não foi possível carregar a barbearia.'), 'error');
    }
  }

  async function setupCalendar(barberId) {
    const grid = $('.calendar-grid');
    const title = $('.calendar-title');
    const timeField = $('#appointment-time');
    if (!grid) return;

    let barberAppointments = [];
    async function loadBarberAppointments() {
      if (!barberId) {
        barberAppointments = [];
        return;
      }

      try {
        barberAppointments = await api.listBarberAppointments(barberId);
      } catch (_error) {
        barberAppointments = [];
      }
    }

    function getMonthDatesFromFirstToLast() {
      const today = new Date();
      const year = today.getFullYear();
      const monthIndex = today.getMonth();
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const dates = [];

      for (let day = 1; day <= lastDay; day += 1) {
        dates.push(new Date(year, monthIndex, day));
      }

      return dates;
    }

    function isSlotTaken(dateValue, timeValue) {
      return barberAppointments.some((appointment) => appointmentMatchesSlot(appointment, dateValue, timeValue));
    }

    function getDateStatus(date, timeValue) {
      const dateValue = toDateInputValue(date);
      const beforeToday = isPastDate(date);
      const pastTimeToday = !beforeToday && isPastDateTime(dateValue, timeValue);
      const taken = isSlotTaken(dateValue, timeValue);
      const available = !beforeToday && !pastTimeToday && !taken;

      if (available) {
        return {
          available: true,
          title: 'Data disponível para agendamento.'
        };
      }

      if (beforeToday) {
        return {
          available: false,
          title: 'Data indisponível: dia anterior à data atual do computador.'
        };
      }

      if (pastTimeToday) {
        return {
          available: false,
          title: 'Horário indisponível: este horário já passou.'
        };
      }

      return {
        available: false,
        title: 'Horário indisponível: já existe agendamento para este barbeiro.'
      };
    }

    function renderCalendar() {
      const selectedBeforeRender = $('.calendar-day.is-selected', grid)?.dataset.date || '';
      const appointmentTime = timeField?.value || '10:00';
      const dates = getMonthDatesFromFirstToLast();
      let firstAvailableButton = null;
      let selectedButton = null;

      grid.innerHTML = '';

      if (title && dates[0]) {
        const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dates[0]);
        title.textContent = `Dias Disponíveis - ${monthName}`;
      }

      dates.forEach((date) => {
        const dateValue = toDateInputValue(date);
        const status = getDateStatus(date, appointmentTime);
        const statusClass = status.available ? 'is-available available' : 'is-unavailable unavailable';
        const button = createElement('button', `calendar-day ${statusClass}`, String(date.getDate()));

        button.type = 'button';
        button.dataset.date = dateValue;
        button.dataset.status = status.available ? 'available' : 'unavailable';
        button.disabled = !status.available;
        button.setAttribute('aria-disabled', String(!status.available));
        button.title = status.title;
        button.setAttribute('aria-label', `${status.title} ${date.toLocaleDateString('pt-BR')}`);

        if (status.available && !firstAvailableButton) {
          firstAvailableButton = button;
        }

        if (status.available && selectedBeforeRender === dateValue) {
          selectedButton = button;
        }

        button.addEventListener('click', () => {
          if (button.disabled) return;
          $all('.calendar-day', grid).forEach((dayButton) => dayButton.classList.remove('is-selected'));
          button.classList.add('is-selected');
        });

        grid.appendChild(button);
      });

      (selectedButton || firstAvailableButton)?.classList.add('is-selected');
    }

    await loadBarberAppointments();
    timeField?.addEventListener('change', renderCalendar);
    renderCalendar();
  }

  function renderServices(services) {
    const servicesFieldset = $('.services');
    if (!servicesFieldset) return;

    servicesFieldset.innerHTML = '<legend class="sr-only">Serviços</legend>';

    if (!Array.isArray(services) || !services.length) {
      servicesFieldset.appendChild(createElement('p', 'empty-state', 'Nenhum serviço cadastrado para este barbeiro.'));
      return;
    }

    services.forEach((service, index) => {
      const label = createElement('label', 'service-option');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'serviceId';
      input.value = service.id;
      input.required = true;
      if (index === 0) input.checked = true;
      label.append(input, document.createTextNode(`${service.name || 'Serviço'} - ${formatCurrency(service.price)}`));
      servicesFieldset.appendChild(label);
    });
  }

  async function setupSchedulePage() {
    const form = $('#schedule-form');
    if (!form) return;

    let barbershopId = getQueryParam('barbershopId');
    let barberId = getQueryParam('barberId');

    try {
      if (!barbershopId || !barberId) {
        const shops = await api.listBarbershops();
        const defaultShop = Array.isArray(shops) ? shops[0] : null;
        const defaultBarbers = defaultShop ? await api.listBarbershopBarbers(defaultShop.id) : [];
        const defaultBarber = Array.isArray(defaultBarbers) ? defaultBarbers[0] : null;

        if (!defaultShop || !defaultBarber) {
          renderPageMessage('Nenhum barbeiro disponível para agendamento.', 'error');
          await setupCalendar(null);
          return;
        }

        barbershopId = String(defaultShop.id);
        barberId = String(defaultBarber.id);
        renderPageMessage('Nenhum barbeiro foi informado na URL. Carreguei o primeiro barbeiro disponível para demonstração.', 'info');
      }

      const barber = await api.getBarbershopBarber(barbershopId, barberId);
      const barberName = $('.barber-card span', form);
      const barberPhoto = $('.barber-card img', form);
      if (barberName) barberName.textContent = barber.name || 'Nome do barbeiro';
      setImage(barberPhoto, fallbackImages.barber, fallbackImages.barber, `Foto de ${barber.name || 'barbeiro'}`);

      let services = [];
      try {
        services = await api.listBarberServices(barberId);
      } catch (_error) {
        services = await api.listBarbershopServices(barbershopId);
      }

      renderServices(services);
      await setupCalendar(barberId);
    } catch (error) {
      renderPageMessage(apiErrorText(error, 'Não foi possível carregar o agendamento.'), 'error');
      await setupCalendar(null);
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(form) || $('.page-message');
      setLoading(form, true);

      const selectedDay = $('.calendar-day.is-selected');
      const selectedService = $('[name="serviceId"]:checked', form);
      const timeField = $('#appointment-time');
      const appointmentDate = selectedDay?.dataset.date;
      const appointmentTime = timeField?.value || '10:00';

      if (!appointmentDate || !selectedService || selectedDay?.disabled) {
        setMessage(message, 'Selecione um dia disponível e um serviço.', 'error');
        setLoading(form, false);
        return;
      }

      if (isPastDateTime(appointmentDate, appointmentTime)) {
        setMessage(message, 'Não é possível agendar em data ou horário anteriores ao atual.', 'error');
        setLoading(form, false);
        return;
      }

      try {
        const appointment = await api.createAppointment({
          appointmentDateTime: `${appointmentDate}T${appointmentTime}:00`,
          barberId: Number(barberId),
          serviceId: Number(selectedService.value),
          barbershopId: Number(barbershopId),
          observation: ''
        });

        if (appointment?.id) {
          localStorage.setItem(LAST_APPOINTMENT_KEY, String(appointment.id));
        }

        window.location.href = `payment.html${appointment?.id ? `?appointmentId=${encodeURIComponent(appointment.id)}` : ''}`;
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Não foi possível criar o agendamento.'), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function scheduleAppointmentsRefreshAfterRemoval(appointment) {
    if (typeof api.getCanceledAppointmentRemovalInfo !== 'function') {
      return null;
    }

    const removalInfo = api.getCanceledAppointmentRemovalInfo(appointment);
    const remainingMs = Number(removalInfo?.remainingMs);

    if (!Number.isFinite(remainingMs)) {
      return null;
    }

    if (remainingMs <= 0) {
      return 0;
    }

    const timerDelay = Math.min(remainingMs + 300, 2147483647);
    appointmentsCleanupRefreshTimer = window.setTimeout(() => {
      appointmentsCleanupRefreshTimer = null;
      setupAppointmentsPage();
    }, timerDelay);

    return remainingMs;
  }

  async function setupAppointmentsPage() {
    const list = $('.appointments-list');
    if (!list) return;

    if (appointmentsCleanupRefreshTimer) {
      window.clearTimeout(appointmentsCleanupRefreshTimer);
      appointmentsCleanupRefreshTimer = null;
    }

    try {
      const appointments = await api.listMyAppointments();
      list.innerHTML = '';

      if (!Array.isArray(appointments) || !appointments.length) {
        list.appendChild(createElement('p', 'empty-state', 'Você ainda não possui agendamentos.'));
        return;
      }

      appointments.forEach((appointment) => {
        const row = createElement('article', `appointment-row ${isAppointmentCanceled(appointment) ? 'is-canceled' : ''}`);
        const barberCard = createElement('a', 'barber-card');
        barberCard.href = `schedule.html?barbershopId=${encodeURIComponent(appointment.service?.barbershop?.id || '')}&barberId=${encodeURIComponent(appointment.barber?.id || '')}`;

        const img = document.createElement('img');
        setImage(img, fallbackImages.barber, fallbackImages.barber, `Foto de ${appointment.barber?.name || 'barbeiro'}`);
        barberCard.append(img, createElement('span', '', appointment.barber?.name || 'Nome do barbeiro'));

        const info = createElement('div', 'appointment-info');
        const text = createElement('p');
        const shopName = appointment.barbershop?.name || appointment.barbershopName || appointment.service?.barbershop?.name || appointment.local || 'Barbearia não informada';
        const shopAddress = appointment.barbershop?.address || appointment.service?.barbershop?.address || '';
        text.innerHTML = `<strong>Barbearia:</strong> ${shopName}<br>${shopAddress ? `<strong>Endereço:</strong> ${shopAddress}<br>` : ''}<strong>Serviço:</strong> ${appointment.service?.name || 'Serviço'}<br><strong>Preço:</strong> ${formatCurrency(appointment.service?.price)}<br><strong>Data Do Agendamento:</strong> ${formatDateTime(appointment.appointmentDateTime)}<br><strong>Status:</strong> ${appointment.status || 'Pendente'}`;

        const actions = createElement('div', 'appointment-actions');
        if (isAppointmentCanceled(appointment)) {
          actions.appendChild(createElement('span', 'status-pill status-canceled', 'Agendamento cancelado'));
          const remainingMs = scheduleAppointmentsRefreshAfterRemoval(appointment);
          if (Number.isFinite(remainingMs) && remainingMs > 0) {
            const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
            actions.appendChild(createElement('small', 'status-removal-note', `Será removido do banco local em até ${minutes} min.`));
          }
        } else {
          const cancelButton = createElement('button', 'btn cancel-appointment-btn', 'Cancelar agendamento');
          cancelButton.type = 'button';
          cancelButton.addEventListener('click', async () => {
            const confirmed = window.confirm('Deseja cancelar este agendamento?');
            if (!confirmed) return;

            try {
              cancelButton.disabled = true;
              cancelButton.textContent = 'Cancelando...';
              await api.cancelAppointment(appointment.id);
              renderPageMessage('Agendamento cancelado com sucesso.', 'success');
              await setupAppointmentsPage();
            } catch (error) {
              renderPageMessage(apiErrorText(error, 'Não foi possível cancelar o agendamento.'), 'error');
              cancelButton.disabled = false;
              cancelButton.textContent = 'Cancelar agendamento';
            }
          });
          actions.appendChild(cancelButton);
        }

        info.append(text, actions);
        row.append(barberCard, info);
        list.appendChild(row);
      });
    } catch (error) {
      renderPageMessage(apiErrorText(error, 'Não foi possível carregar seus agendamentos.'), 'error');
    }
  }

  function setupPaymentPage() {
    const redirectDelayInSeconds = 6;
    const countdownElement = $('#redirect-countdown');
    const appointmentsPage = 'appointments.html';
    let remainingSeconds = redirectDelayInSeconds;

    const countdownTimer = setInterval(() => {
      remainingSeconds -= 1;

      if (countdownElement) {
        countdownElement.textContent = String(Math.max(remainingSeconds, 0));
      }

      if (remainingSeconds <= 0) {
        clearInterval(countdownTimer);
      }
    }, 1000);

    setTimeout(() => {
      window.location.href = appointmentsPage;
    }, redirectDelayInSeconds * 1000);
  }

  function formatIsoBirthDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  }

  function renderProfileUser(user) {
    const userInfo = $('.profile-user-info');
    const photoPreview = $('#profile-photo-preview');
    const photoLink = $('.profile-photo-wrap .image-ref');

    if (photoPreview) {
      const profilePhotoUrl = user.profilePhotoUrl || fallbackImages.profile;
      setImage(photoPreview, profilePhotoUrl, fallbackImages.profile, `Foto de perfil de ${user.name || 'usuário'}`);
      if (photoLink) {
        photoLink.href = profilePhotoUrl;
      }
    }

    if (userInfo) {
      const cpfText = user.cpf ? formatCpf(user.cpf) : 'CPF não informado';
      const birthText = user.birthDate ? formatIsoBirthDate(user.birthDate) : 'Data de nascimento não informada';
      userInfo.innerHTML = `
        <strong>${user.name || 'Usuário'}</strong><br>
        E-mail: ${user.email || 'Não informado'}<br>
        CPF: ${cpfText}<br>
        Data de nascimento: ${birthText}
      `;
    }

    const nameField = $('#edit-name');
    const emailField = $('#edit-email');
    const cpfField = $('#edit-cpf');
    const birthDateField = $('#edit-birth-date');
    const profilePhotoField = $('#edit-profile-photo-url');

    if (nameField) nameField.value = user.name || '';
    if (emailField) emailField.value = user.email || '';
    if (cpfField) cpfField.value = formatCpf(user.cpf || '');
    if (birthDateField) birthDateField.value = formatIsoBirthDate(user.birthDate || '');
    if (profilePhotoField) profilePhotoField.value = user.profilePhotoUrl || fallbackImages.profile;
  }

  function closeOtherProfileDropdowns(activeDetails) {
    $all('.profile-edit-dropdown[open]').forEach((details) => {
      if (details !== activeDetails) {
        details.removeAttribute('open');
      }
    });
  }

  async function setupUserPage() {
    const profileMain = $('.profile-main');
    if (!profileMain) return;

    let user;
    try {
      user = await api.me();
      api.setCurrentUser(user);
    } catch (error) {
      renderPageMessage(apiErrorText(error, 'Não foi possível carregar seu perfil.'), 'error');
      return;
    }

    renderProfileUser(user);

    $all('.profile-edit-dropdown').forEach((details) => {
      details.addEventListener('toggle', () => {
        if (details.open) {
          closeOtherProfileDropdowns(details);
        }
      });
    });

    $all('.profile-edit-form').forEach((form) => {
      setupCpfField(form);
      setupBirthDateField(form);

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = getFormMessage(form);
        const formType = form.dataset.profileForm;
        const formData = new FormData(form);

        setMessage(message, '', 'info');
        setLoading(form, true);

        try {
          if (formType === 'name') {
            const name = String(formData.get('name') || '').trim();
            if (!name) {
              throw new Error('Informe um nome válido.');
            }
            user = await api.updateCurrentUser({ name });
            setMessage(message, 'Nome atualizado com sucesso.', 'success');
          }

          if (formType === 'email') {
            const email = String(formData.get('email') || '').trim();
            if (!isValidEmail(email)) {
              throw new Error('Email inválido');
            }
            user = await api.updateCurrentUser({ email });
            setMessage(message, 'E-mail atualizado com sucesso.', 'success');
          }

          if (formType === 'cpf') {
            const cpf = getCpfDigits(formData.get('cpf'));
            if (cpf.length !== 11) {
              throw new Error('Informe um CPF com 11 números.');
            }
            user = await api.updateCurrentUser({ cpf });
            setMessage(message, 'CPF atualizado com sucesso.', 'success');
          }

          if (formType === 'birthDate') {
            const birthDate = birthDateToIso(formData.get('birthDate'));
            if (!birthDate) {
              throw new Error('Informe uma data de nascimento válida no formato DD/MM/AAAA.');
            }
            user = await api.updateCurrentUser({ birthDate });
            setMessage(message, 'Data de nascimento atualizada com sucesso.', 'success');
          }

          if (formType === 'profilePhotoUrl') {
            const profilePhotoUrl = String(formData.get('profilePhotoUrl') || '').trim() || fallbackImages.profile;
            user = await api.updateCurrentUser({ profilePhotoUrl });
            setMessage(message, 'Foto de perfil atualizada com sucesso.', 'success');
          }

          if (formType === 'password') {
            const currentPassword = String(formData.get('currentPassword') || '');
            const newPassword = String(formData.get('newPassword') || '');
            const confirmPassword = String(formData.get('confirmPassword') || '');

            if (newPassword !== confirmPassword) {
              throw new Error('As senhas não conferem.');
            }

            const passwordError = getPasswordValidationMessage(newPassword);
            if (passwordError) {
              throw new Error(passwordError);
            }

            await api.updateCurrentPassword({ currentPassword, newPassword });
            form.reset();
            setMessage(message, 'Senha atualizada com sucesso.', 'success');
          }

          const updatedUser = await api.me();
          api.setCurrentUser(updatedUser);
          renderProfileUser(updatedUser);
        } catch (error) {
          setMessage(message, apiErrorText(error, error.message || 'Não foi possível atualizar o perfil.'), 'error');
        } finally {
          setLoading(form, false);
        }
      });
    });
  }

  function setupRegisterBarbershopPage() {
    const form = $('#register-barbershop-form');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = getFormMessage(form);
      setLoading(form, true);

      const formData = new FormData(form);
      const payload = {
        name: String(formData.get('name') || '').trim(),
        cnpj: String(formData.get('cnpj') || '').trim(),
        phone: String(formData.get('phone') || '').trim() || null,
        address: String(formData.get('address') || '').trim(),
        businessHours: String(formData.get('businessHours') || '').trim() || null,
        photoUrl: String(formData.get('photoUrl') || '').trim() || null,
        latitude: Number(formData.get('latitude') || 0),
        longitude: Number(formData.get('longitude') || 0)
      };

      try {
        const shop = await api.createBarbershop(payload);
        setMessage(message, 'Barbearia cadastrada com sucesso.', 'success');
        setTimeout(() => {
          window.location.href = `barbershop.html?id=${encodeURIComponent(shop.id)}`;
        }, 900);
      } catch (error) {
        setMessage(message, apiErrorText(error, 'Não foi possível cadastrar a barbearia.'), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  async function boot() {
    ensureHeaderLogo();

    if (!api) return;

    const authMode = document.body.dataset.auth;
    const page = document.body.dataset.page;

    if (authMode === 'protected') {
      try {
        await api.requireAuth();
      } catch (_error) {
        return;
      }
    }

    renderProtectedNav();

    switch (page) {
      case 'login':
        setupLoginPage();
        break;
      case 'register-user':
        setupUserRegisterPage();
        break;
      case 'verify-email':
        setupVerifyEmailPage();
        break;
      case 'reset-password':
        setupResetPasswordPage();
        break;
      case 'register-barbershop':
        setupRegisterBarbershopPage();
        break;
      case 'home':
        await setupHomePage();
        break;
      case 'barbershop':
        await setupBarbershopPage();
        break;
      case 'schedule':
        await setupSchedulePage();
        break;
      case 'appointments':
        await setupAppointmentsPage();
        break;
      case 'payment':
        setupPaymentPage();
        break;
      case 'user':
        await setupUserPage();
        break;
      default:
        break;
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
