const API_BASE = '/api';

let token = localStorage.getItem('token');
let currentUser = null;
let selectedFiles = { images: [], videos: [] };
let allMessages = [];
let currentFilter = 'recent';

const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');
const authSection = document.getElementById('authSection');
const composerAvatar = document.getElementById('composerAvatar');
const composerUserName = document.getElementById('composerUserName');
const composerUserMeta = document.getElementById('composerUserMeta');
const authorNameInput = document.getElementById('authorName');
const messageContentInput = document.getElementById('messageContent');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const mediaPreview = document.getElementById('mediaPreview');
const sendBtn = document.getElementById('sendBtn');
const loading = document.getElementById('loading');
const messagesContainer = document.getElementById('messagesContainer');
const searchInput = document.getElementById('searchInput');
const toastContainer = document.getElementById('toastContainer');

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderFeed();
  });
});

closeAuthModalBtn.addEventListener('click', closeAuthModal);
imageInput.addEventListener('change', (e) => handleFileSelect(e, 'image'));
videoInput.addEventListener('change', (e) => handleFileSelect(e, 'video'));
sendBtn.addEventListener('click', sendMessage);
searchInput.addEventListener('input', renderFeed);

function showToast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  toastContainer.appendChild(item);

  setTimeout(() => {
    item.remove();
  }, 2600);
}

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('es-ES');
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function canvasAvatar(name = 'U', size = 120, colorA = '#4f7cff', colorB = '#7a5cff') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  const initial = (name || 'U').trim().charAt(0).toUpperCase();

  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${size * 0.42}px Inter, Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, size / 2, size / 2 + 2);

  return canvas.toDataURL('image/png');
}

function getUserId(user) {
  return user?.id || user?._id || null;
}

function getAvatarUrl(name, avatar) {
  return avatar || canvasAvatar(name || 'U');
}

function renderAvatar(container, name, avatar) {
  container.innerHTML = `<img src="${getAvatarUrl(name, avatar)}" alt="${escapeHtml(name)}">`;
}

function openAuthModal(type = 'login') {
  if (type === 'login') {
    authForm.innerHTML = `
      <h2>Iniciar sesión</h2>
      <input type="email" id="loginEmail" placeholder="Correo electrónico" />
      <input type="password" id="loginPassword" placeholder="Contraseña" />
      <button class="primary-btn" id="submitLoginBtn">Entrar</button>
      <div class="auth-switch">
        ¿No tienes cuenta?
        <a href="#" id="goRegisterLink">Crear una</a>
      </div>
    `;
  } else {
    authForm.innerHTML = `
      <h2>Crear cuenta</h2>
      <input type="text" id="registerUsername" placeholder="Nombre de usuario" />
      <input type="email" id="registerEmail" placeholder="Correo electrónico" />
      <input type="password" id="registerPassword" placeholder="Contraseña" />
      <button class="primary-btn" id="submitRegisterBtn">Registrarme</button>
      <div class="auth-switch">
        ¿Ya tienes cuenta?
        <a href="#" id="goLoginLink">Iniciar sesión</a>
      </div>
    `;
  }

  authModal.classList.remove('hidden');

  const goRegisterLink = document.getElementById('goRegisterLink');
  const goLoginLink = document.getElementById('goLoginLink');
  const submitLoginBtn = document.getElementById('submitLoginBtn');
  const submitRegisterBtn = document.getElementById('submitRegisterBtn');

  goRegisterLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('register');
  });

  goLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });

  submitLoginBtn?.addEventListener('click', login);
  submitRegisterBtn?.addEventListener('click', register);
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

async function register() {
  try {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (!username || !email || !password) {
      showToast('Completa todos los campos', 'error');
      return;
    }

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo registrar');
    }

    token = data.token;
    localStorage.setItem('token', token);
    await loadCurrentUser();
    updateAuthUI();
    closeAuthModal();
    showToast('Cuenta creada correctamente');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function login() {
  try {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
      showToast('Completa todos los campos', 'error');
      return;
    }

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo iniciar sesión');
    }

    token = data.token;
    localStorage.setItem('token', token);
    await loadCurrentUser();
    updateAuthUI();
    closeAuthModal();
    showToast('Sesión iniciada');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
  loadMessages();
  showToast('Sesión cerrada');
}

function updateAuthUI() {
  if (currentUser) {
    authSection.innerHTML = `
      <div class="user-card">
        <div class="user-card-top">
          <div class="user-mini-avatar" id="sidebarUserAvatar"></div>
          <div class="user-mini-meta">
            <strong>${escapeHtml(currentUser.username)}</strong>
            <span>${escapeHtml(currentUser.email)}</span>
          </div>
        </div>

        <div class="user-card-actions">
          <button class="secondary-btn" id="goMyProfileBtn">Mi perfil</button>
          <button class="secondary-btn" id="logoutBtn">Salir</button>
        </div>
      </div>
    `;

    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    sidebarUserAvatar.innerHTML = `<img src="${getAvatarUrl(currentUser.username, currentUser.profile?.avatar)}" alt="${escapeHtml(currentUser.username)}">`;

    document.getElementById('goMyProfileBtn').addEventListener('click', () => {
      window.location.href = '/profile.html';
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);

    composerUserName.textContent = currentUser.username;
    composerUserMeta.textContent = 'Publicando con tu perfil';
    authorNameInput.value = currentUser.username;
    authorNameInput.disabled = true;
    authorNameInput.classList.add('hidden');
    renderAvatar(composerAvatar, currentUser.username, currentUser.profile?.avatar);
  } else {
    authSection.innerHTML = `
      <div class="user-card">
        <button class="primary-btn" id="openLoginBtn">Iniciar sesión</button>
        <button class="secondary-btn" id="openRegisterBtn">Crear cuenta</button>
      </div>
    `;

    document.getElementById('openLoginBtn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('openRegisterBtn').addEventListener('click', () => openAuthModal('register'));

    composerUserName.textContent = 'Invitado';
    composerUserMeta.textContent = 'Publicación anónima opcional';
    authorNameInput.value = '';
    authorNameInput.disabled = false;
    authorNameInput.classList.remove('hidden');
    renderAvatar(composerAvatar, 'Invitado', null);
  }
}

async function loadCurrentUser() {
  if (!token) {
    currentUser = null;
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      token = null;
      currentUser = null;
      localStorage.removeItem('token');
      return;
    }

    const user = await response.json();
    user.id = getUserId(user);
    currentUser = user;
  } catch {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
  }
}

function handleFileSelect(event, type) {
  const files = Array.from(event.target.files || []);
  if (type === 'image') selectedFiles.images = files;
  if (type === 'video') selectedFiles.videos = files;

  mediaPreview.innerHTML = '';

  [...selectedFiles.images, ...selectedFiles.videos].forEach((file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const url = e.target.result;
      const isImage = file.type.startsWith('image/');
      const element = document.createElement(isImage ? 'img' : 'video');
      element.src = url;
      if (!isImage) element.controls = true;
      mediaPreview.appendChild(element);
    };

    reader.readAsDataURL(file);
  });
}

function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const response = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: e.target.result,
            type: file.type.startsWith('image/') ? 'image' : 'video'
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al subir archivo');
        }

        resolve(data.url);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Error leyendo archivo'));
    reader.readAsDataURL(file);
  });
}

async function sendMessage() {
  try {
    const content = messageContentInput.value.trim();
    const author = currentUser ? currentUser.username : (authorNameInput.value.trim() || 'Anónimo');

    if (!content) {
      showToast('Escribe un mensaje', 'error');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Publicando...';

    const images = [];
    const videos = [];

    for (const file of selectedFiles.images) {
      const url = await uploadFile(file);
      images.push(url);
    }

    for (const file of selectedFiles.videos) {
      const url = await uploadFile(file);
      videos.push(url);
    }

    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        author,
        content,
        images,
        videos
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo publicar');
    }

    messageContentInput.value = '';
    mediaPreview.innerHTML = '';
    imageInput.value = '';
    videoInput.value = '';
    selectedFiles = { images: [], videos: [] };

    if (!currentUser) {
      authorNameInput.value = '';
    }

    showToast('Mensaje publicado');
    await loadMessages();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Publicar';
  }
}

async function loadMessages() {
  try {
    loading.classList.remove('hidden');
    const response = await fetch(`${API_BASE}/messages`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar mensajes');
    }

    allMessages = data;
    renderFeed();
  } catch (error) {
    messagesContainer.innerHTML = `<div class="message-card glass">Error cargando mensajes</div>`;
  } finally {
    loading.classList.add('hidden');
  }
}

function getFilteredMessages() {
  const query = searchInput.value.trim().toLowerCase();
  let list = [...allMessages];

  if (currentFilter === 'trending') {
    list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  if (currentFilter === 'myMessages') {
    if (!currentUser?.id) return [];
    list = list.filter((msg) => String(msg.author?.userId || '') === String(currentUser.id));
  }

  if (query) {
    list = list.filter((msg) => {
      return (
        (msg.content || '').toLowerCase().includes(query) ||
        (msg.author?.name || '').toLowerCase().includes(query)
      );
    });
  }

  return list;
}

function renderFeed() {
  const list = getFilteredMessages();

  if (!list.length) {
    messagesContainer.innerHTML = `
      <div class="message-card glass">
        No hay mensajes para mostrar.
      </div>
    `;
    return;
  }

  messagesContainer.innerHTML = '';
  list.forEach(renderMessageCard);
}

function renderMessageMedia(message) {
  let html = '';

  if (message.images?.length) {
    html += '<div class="message-media">';
    message.images.forEach((img) => {
      html += `<img src="${img}" alt="media">`;
    });
    html += '</div>';
  }

  if (message.videos?.length) {
    html += '<div class="message-media">';
    message.videos.forEach((vid) => {
      html += `<video controls><source src="${vid}"></video>`;
    });
    html += '</div>';
  }

  return html;
}

function renderMessageCard(message) {
  const card = document.createElement('article');
  card.className = 'message-card glass';

  const authorName = message.author?.name || 'Anónimo';
  const authorAvatar = message.author?.avatar || null;
  const authorUserId = message.author?.userId || null;
  const canEdit = currentUser?.id && authorUserId && String(currentUser.id) === String(authorUserId);

  card.innerHTML = `
    <div class="message-header">
      <div class="message-user">
        <div class="message-avatar" data-profile-id="${authorUserId || ''}"></div>

        <div class="message-user-meta">
          <div class="message-user-name" data-profile-id="${authorUserId || ''}">
            ${escapeHtml(authorName)}
          </div>

          <div class="message-user-sub">
            <span>${timeAgo(message.createdAt)}</span>
            ${message.edited ? '<span>editado</span>' : ''}
          </div>
        </div>
      </div>

      <div class="message-date">${formatDate(message.createdAt)}</div>
    </div>

    <div class="message-content">${escapeHtml(message.content || '')}</div>

    ${renderMessageMedia(message)}

    <div class="message-actions">
      <button class="action-btn reply-btn">Responder</button>
      <button class="action-btn like-btn">Like ${message.likes || 0}</button>
      ${canEdit ? '<button class="action-btn edit-btn">Editar</button>' : ''}
      ${canEdit ? '<button class="action-btn danger delete-btn">Eliminar</button>' : ''}
    </div>

    <div class="replies" id="replies-${message._id}"></div>
  `;

  const avatarNode = card.querySelector('.message-avatar');
  renderAvatar(avatarNode, authorName, authorAvatar);

  avatarNode.addEventListener('click', () => {
    if (authorUserId) window.location.href = `/profile.html?id=${authorUserId}`;
  });

  card.querySelector('.message-user-name').addEventListener('click', () => {
    if (authorUserId) window.location.href = `/profile.html?id=${authorUserId}`;
  });

  card.querySelector('.reply-btn').addEventListener('click', () => showReplyForm(message._id));
  card.querySelector('.like-btn').addEventListener('click', () => likeMessage(message._id));

  card.querySelector('.edit-btn')?.addEventListener('click', () => editMessage(message));
  card.querySelector('.delete-btn')?.addEventListener('click', () => deleteMessage(message._id));

  card.querySelectorAll('.message-media img').forEach((img) => {
    img.addEventListener('click', () => window.open(img.src, '_blank'));
  });

  messagesContainer.appendChild(card);
  loadReplies(message._id);
}

async function loadReplies(messageId) {
  try {
    const container = document.getElementById(`replies-${messageId}`);
    if (!container) return;

    const response = await fetch(`${API_BASE}/messages/${messageId}/replies`);
    const replies = await response.json();

    if (!response.ok) return;

    container.innerHTML = '';

    replies.forEach((reply) => {
      const item = document.createElement('div');
      item.className = 'reply-item';

      const name = reply.author?.name || 'Anónimo';
      const avatar = reply.author?.avatar || null;
      const userId = reply.author?.userId || null;

      item.innerHTML = `
        <div class="reply-top">
          <div class="reply-avatar"></div>
          <div>
            <div class="reply-name">${escapeHtml(name)}</div>
            <div class="reply-date">${timeAgo(reply.createdAt)}</div>
          </div>
        </div>
        <div class="reply-content">${escapeHtml(reply.content || '')}</div>
      `;

      const avatarNode = item.querySelector('.reply-avatar');
      renderAvatar(avatarNode, name, avatar);

      const replyName = item.querySelector('.reply-name');
      if (userId) {
        replyName.addEventListener('click', () => {
          window.location.href = `/profile.html?id=${userId}`;
        });

        avatarNode.addEventListener('click', () => {
          window.location.href = `/profile.html?id=${userId}`;
        });
      }

      container.appendChild(item);
    });
  } catch {
    // silencio
  }
}

function showReplyForm(messageId) {
  const container = document.getElementById(`replies-${messageId}`);
  if (!container) return;

  if (container.querySelector('.reply-form')) return;

  const form = document.createElement('div');
  form.className = 'reply-form';

  form.innerHTML = `
    ${currentUser ? '' : '<input type="text" class="reply-author-input" placeholder="Tu nombre, opcional" maxlength="50">'}
    <textarea class="reply-content-input" placeholder="Escribe tu respuesta"></textarea>
    <div class="reply-form-actions">
      <button class="primary-btn submit-reply-btn">Responder</button>
      <button class="secondary-btn cancel-reply-btn">Cancelar</button>
    </div>
  `;

  container.prepend(form);

  form.querySelector('.cancel-reply-btn').addEventListener('click', () => form.remove());

  form.querySelector('.submit-reply-btn').addEventListener('click', async () => {
    try {
      const content = form.querySelector('.reply-content-input').value.trim();
      const authorInput = form.querySelector('.reply-author-input');
      const author = currentUser ? currentUser.username : (authorInput?.value.trim() || 'Anónimo');

      if (!content) {
        showToast('Escribe una respuesta', 'error');
        return;
      }

      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          author,
          content,
          parentId: messageId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo responder');
      }

      form.remove();
      await loadMessages();
      showToast('Respuesta publicada');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function likeMessage(messageId) {
  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}/like`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo dar like');
    }

    const target = allMessages.find((m) => m._id === messageId);
    if (target) {
      target.likes = data.likes;
      renderFeed();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function editMessage(message) {
  const newContent = prompt('Editar mensaje', message.content || '');
  if (newContent === null) return;

  try {
    const response = await fetch(`${API_BASE}/messages/${message._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ content: newContent })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo editar');
    }

    await loadMessages();
    showToast('Mensaje editado');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function deleteMessage(messageId) {
  if (!confirm('¿Eliminar este mensaje?')) return;

  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo eliminar');
    }

    await loadMessages();
    showToast('Mensaje eliminado');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function init() {
  await loadCurrentUser();
  updateAuthUI();
  await loadMessages();
}

init();
setInterval(loadMessages, 12000);
