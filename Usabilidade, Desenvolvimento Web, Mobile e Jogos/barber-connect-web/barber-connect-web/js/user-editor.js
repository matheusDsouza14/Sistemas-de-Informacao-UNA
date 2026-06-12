(() => {
  const api = window.BarberConnectApi;

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }

  function formatBirthDate(value) {
    const digits = onlyDigits(value).slice(0, 8);
    return digits
      .replace(/^(\d{2})(\d)/, '$1/$2')
      .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
  }

  function isoToBrazilianDate(value) {
    if (!value) return '';
    const [year, month, day] = String(value).split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  }

  function brazilianDateToIso(value) {
    const digits = onlyDigits(value);
    if (digits.length !== 8) return '';

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    const date = new Date(year, month - 1, day);
    const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    const future = date.getTime() > Date.now();

    if (!valid || future) return '';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function isValidEmail(email) {
    return String(email || '').includes('@');
  }

  function passwordValidationMessage(password) {
    const value = String(password || '');
    if (value.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
    if (!/[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ]/.test(value)) return 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/\d/.test(value)) return 'A senha deve conter pelo menos um número.';
    if (!/[^A-Za-z0-9ÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇáàâãéèêíìîóòôõúùûç]/.test(value)) return 'A senha deve conter pelo menos um caractere especial.';
    return '';
  }

  function setMessage(form, text, type = 'info') {
    const message = $('.form-message', form);
    if (!message) return;
    message.textContent = text || '';
    message.classList.remove('is-success', 'is-error', 'is-info');
    if (text) message.classList.add(`is-${type}`);
  }

  function setLoading(form, isLoading) {
    $$('button, input, select, textarea', form).forEach((control) => {
      control.disabled = isLoading;
    });
  }

  function renderUser(user) {
    const info = $('.profile-user-info');
    const photo = $('#profile-photo-preview');
    const photoLink = $('#profile-photo-link');
    const photoUrl = user.profilePhotoUrl || 'assets/profile-photo.svg';

    if (info) {
      info.innerHTML = `
        <strong>${user.name || 'Usuário'}</strong><br>
        E-mail: ${user.email || 'Não informado'}<br>
        CPF: ${user.cpf ? formatCpf(user.cpf) : 'Não informado'}<br>
        Data de nascimento: ${user.birthDate ? isoToBrazilianDate(user.birthDate) : 'Não informada'}
      `;
    }

    if (photo) {
      photo.src = photoUrl;
      photo.alt = `Foto de perfil de ${user.name || 'usuário'}`;
      photo.onerror = () => {
        photo.onerror = null;
        photo.src = 'assets/profile-photo.svg';
      };
    }

    if (photoLink) {
      photoLink.href = photoUrl;
    }

    const name = $('#edit-name');
    const email = $('#edit-email');
    const cpf = $('#edit-cpf');
    const birthDate = $('#edit-birth-date');
    const profilePhotoUrl = $('#edit-profile-photo-url');

    if (name) name.value = user.name || '';
    if (email) email.value = user.email || '';
    if (cpf) cpf.value = formatCpf(user.cpf || '');
    if (birthDate) birthDate.value = isoToBrazilianDate(user.birthDate || '');
    if (profilePhotoUrl) profilePhotoUrl.value = photoUrl;
  }

  function showSelectedPanel(value) {
    $$('.profile-edit-panel').forEach((panel) => {
      const isSelected = panel.dataset.editPanel === value;
      panel.classList.toggle('is-hidden', !isSelected);
      panel.hidden = !isSelected;
      if (!isSelected) setMessage(panel, '');
    });
  }

  async function refreshUser() {
    const user = await api.me();
    api.setCurrentUser(user);
    renderUser(user);
    return user;
  }

  async function handlePanelSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const type = form.dataset.editPanel;
    const data = new FormData(form);

    setMessage(form, '');
    setLoading(form, true);

    try {
      if (type === 'name') {
        const name = String(data.get('name') || '').trim();
        if (!name) throw new Error('Informe um nome válido.');
        await api.updateCurrentUser({ name });
        await refreshUser();
        setMessage(form, 'Nome atualizado com sucesso.', 'success');
      }

      if (type === 'email') {
        const email = String(data.get('email') || '').trim().toLowerCase();
        if (!isValidEmail(email)) throw new Error('Email inválido');
        await api.updateCurrentUser({ email });
        await refreshUser();
        setMessage(form, 'E-mail atualizado com sucesso.', 'success');
      }

      if (type === 'cpf') {
        const cpf = onlyDigits(data.get('cpf')).slice(0, 11);
        if (cpf.length !== 11) throw new Error('Informe um CPF com 11 números.');
        await api.updateCurrentUser({ cpf });
        await refreshUser();
        setMessage(form, 'CPF atualizado com sucesso.', 'success');
      }

      if (type === 'birthDate') {
        const birthDate = brazilianDateToIso(data.get('birthDate'));
        if (!birthDate) throw new Error('Informe uma data de nascimento válida no formato DD/MM/AAAA.');
        await api.updateCurrentUser({ birthDate });
        await refreshUser();
        setMessage(form, 'Data de nascimento atualizada com sucesso.', 'success');
      }

      if (type === 'profilePhotoUrl') {
        const profilePhotoUrl = String(data.get('profilePhotoUrl') || '').trim() || 'assets/profile-photo.svg';
        await api.updateCurrentUser({ profilePhotoUrl });
        await refreshUser();
        setMessage(form, 'Foto de perfil atualizada com sucesso.', 'success');
      }

      if (type === 'password') {
        const currentPassword = String(data.get('currentPassword') || '');
        const newPassword = String(data.get('newPassword') || '');
        const confirmPassword = String(data.get('confirmPassword') || '');

        if (newPassword !== confirmPassword) throw new Error('As senhas não conferem.');
        const passwordError = passwordValidationMessage(newPassword);
        if (passwordError) throw new Error(passwordError);

        await api.updateCurrentPassword({ currentPassword, newPassword });
        form.reset();
        await refreshUser();
        setMessage(form, 'Senha atualizada com sucesso.', 'success');
      }
    } catch (error) {
      setMessage(form, error?.message || 'Não foi possível atualizar o perfil.', 'error');
    } finally {
      setLoading(form, false);
    }
  }

  async function setupUserEditor() {
    if (document.body.dataset.page !== 'user' || !api) return;

    const menu = $('#profile-edit-menu');
    if (!menu) return;

    try {
      await refreshUser();
    } catch (error) {
      const info = $('.profile-user-info');
      if (info) info.textContent = error?.message || 'Não foi possível carregar seu perfil.';
    }

    showSelectedPanel(menu.value);

    menu.addEventListener('change', () => {
      showSelectedPanel(menu.value);
    });

    const cpf = $('#edit-cpf');
    const birthDate = $('#edit-birth-date');

    if (cpf) {
      cpf.addEventListener('input', () => {
        cpf.value = formatCpf(cpf.value);
      });
    }

    if (birthDate) {
      birthDate.addEventListener('input', () => {
        birthDate.value = formatBirthDate(birthDate.value);
      });
    }

    $$('.profile-edit-panel').forEach((form) => {
      form.addEventListener('submit', handlePanelSubmit);
    });
  }

  document.addEventListener('DOMContentLoaded', setupUserEditor);
})();
