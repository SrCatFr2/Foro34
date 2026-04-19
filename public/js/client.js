const API_BASE = '/api';

let token = localStorage.getItem('token');
let currentUser = null;
let allMessages = [];
let currentFilter = 'recent';
let selectedFiles = { images: [], videos: [] };

const sidebar = document.getElementById('sidebar');
const sidebarOpenBtn = document.getElementById('sidebarOpenBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const mobileOverlay = document.getElementById('mobileOverlay');

const sidebarUser = document.getElementById('sidebarUser');
const topbarAuth = document.getElementById('topbarAuth');

const composerAvatar = document.getElementById('composerAvatar');
const composerName = document.getElementById('composerName');
const composerSubtitle = document.getElementById('composerSubtitle');
const authorNameInput = document.getElementById('authorName');
const messageContentInput = document.getElementById('messageContent');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const mediaPreview = document.getElementById('mediaPreview');
const sendBtn = document.getElementById('sendBtn');
const loading = document.getElementById('loading');
const messagesContainer = document.getElementById('messagesContainer');
const searchInput = document.getElementById('searchInput');

const statThreads = document.getElementById('statThreads');
const statReplies = document.getElementById('statReplies');
const statLikes = document.getElementById('statLikes');

const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const closeAuthModalBtn = document.getElementById('closeAuthModalBtn');

const toastContainer = document.getElementById('toastContainer');

const quickRecentBtn = document.getElementById('quickRecentBtn');
const quickTrendingBtn = document.getElementById('quickTrendingBtn');
const quickTopBtn = document.getElementById('quickTopBtn');

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => toast.remove(), 2600);
}

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getUserId(user) {
  return user?.id || user?._id || null;
}

function avatarDataUrl(name = 'U', bg = '#ff2b47', fg = '#ffffff') {
  const initial = (name.trim()[0] || 'U').toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="#7a0e1f" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r="64" fill="url(#g)" />
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
            font-family="Inter, Arial, sans-serif" font-size="52" font-weight="800" fill="${fg}">
        ${initial}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getAvatar(name, avatar) {
  return avatar || avatarDataUrl(name);
}

function renderAvatar(container, name, avatar) {
  container.innerHTML = `<img src="${getAvatar(name, avatar)}" alt="${escapeHtml(name)}">`;
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('es-ES');
}

function isMobileView() {
  return window.innerWidth <= 920;
}

function openSidebar() {
  sidebar.classList.add('open');
  mobileOverlay.classList.remove('hidden');
  document.body.classList.add('sidebar-lock');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  mobileOverlay.classList.add('hidden');
  document.body.classList.remove('sidebar-lock');
}

sidebarOpenBtn?.addEventListener('click', openSidebar);
sidebarCloseBtn?.addEventListener('click', closeSidebar);
mobileOverlay?.addEventListener('click', closeSidebar);

window.addEventListener('resize', () => {
  if (!isMobileView()) {
    closeSidebar();
  }
});

quickRecentBtn?.addEventListener('click', () => setFilter('recent'));
quickTrendingBtn?.addEventListener('click', () => setFilter('trending'));
quickTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

document.querySelectorAll('.side-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    setFilter(btn.dataset.filter);
    if (isMobileView()) closeSidebar();
  });
});

function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll('.side-link').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });

  renderFeed();
}

function openAuthModal(type = 'login') {
  if (type === 'login') {
    authForm.innerHTML = `
      <h2>Iniciar sesión</h2>
      <p>Accede para usar perfil, foto y personalización.</p>

      <input type="email" id="loginEmail" placeholder="Correo electrónico" />
      <input type="password" id="loginPassword" placeholder="Contraseña" />

      <button class="primary-btn" id="submitLoginBtn">
        <i class="fa-solid fa-right-to-bracket"></i>
        <span>Entrar</span>
      </button>

      <div class="auth-switch">
        ¿No tienes cuenta?
        <a href="#" id="goRegisterLink">Crear una</a>
      </div>
    `;
  } else {
    authForm.innerHTML = `
      <h2>Crear cuenta</h2>
      <p>Activa perfil, nombre fijo y foto personalizada.</p>

      <input type="text" id="registerUsername" placeholder="Nombre de usuario" />
      <input type="email" id="registerEmail" placeholder="Correo electrónico" />
      <input type="password" id="registerPassword" placeholder="Contraseña" />

      <button class="primary-btn" id="submitRegisterBtn">
        <i class="fa-solid fa-user-plus"></i>
        <span>Registrarme</span>
      </button>

      <div class="auth-switch">
        ¿Ya tienes cuenta?
        <a href="#" id="goLoginLink">Iniciar sesión</a>
      </div>
    `;
  }

  authModal.classList.remove('hidden');

  document.getElementById('goRegisterLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('register');
  });

  document.getElementById('goLoginLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal('login');
  });

  document.getElementById('submitLoginBtn')?.addEventListener('click', login);
  document.getElementById('submitRegisterBtn')?.addEventListener('click', register);
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

closeAuthModalBtn?.addEventListener('click', closeAuthModal);

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
    updateUIFromSession();
    closeAuthModal();
    showToast('Cuenta creada');
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
    updateUIFromSession();
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
  updateUIFromSession();
  renderFeed();
  showToast('Sesión cerrada');
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
      localStorage.removeItem('token');
      currentUser = null;
      return;
    }

    const user = await response.json();
    user.id = getUserId(user);
    currentUser = user;
  } catch {
    token = null;
    localStorage.removeItem('token');
    currentUser = null;
  }
}

function updateUIFromSession() {
  if (currentUser) {
    sidebarUser.innerHTML = `
      <div class="user-box">
        <div class="user-box-top">
          <div class="user-box-avatar" id="sidebarUserAvatar"></div>

          <div class="user-box-meta">
            <strong>${escapeHtml(currentUser.username)}</strong>
            <span>${escapeHtml(currentUser.email || '')}</span>
          </div>
        </div>

        <div class="user-box-actions">
          <button class="secondary-btn" id="goProfileBtn">
            <i class="fa-regular fa-user"></i>
            <span>Perfil</span>
          </button>

          <button class="secondary-btn" id="logoutBtn">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Salir</span>
          </button>
        </div>
      </div>
    `;

    topbarAuth.innerHTML = `
      <button class="user-chip" id="topProfileBtn">
        <i class="fa-regular fa-user"></i>
        <span>${escapeHtml(currentUser.username)}</span>
      </button>
    `;

    renderAvatar(
      document.getElementById('sidebarUserAvatar'),
      currentUser.username,
      currentUser.profile?.avatar
    );

    document.getElementById('goProfileBtn')?.addEventListener('click', () => {
      window.location.href = '/profile.html';
    });

    document.getElementById('topProfileBtn')?.addEventListener('click', () => {
      window.location.href = '/profile.html';
    });

    document.getElementById('logoutBtn')?.addEventListener('click', logout);

    composerName.textContent = currentUser.username;
    composerSubtitle.textContent = 'Publicando con tu perfil';
    authorNameInput.value = currentUser.username;
    authorNameInput.disabled = true;
    authorNameInput.classList.add('hidden');
    renderAvatar(composerAvatar, currentUser.username, currentUser.profile?.avatar);
  } else {
    sidebarUser.innerHTML = `
      <div class="user-box">
        <button class="primary-btn" id="sidebarLoginBtn">
          <i class="fa-solid fa-right-to-bracket"></i>
          <span>Iniciar sesión</span>
        </button>

        <button class="secondary-btn" id="sidebarRegisterBtn">
          <i class="fa-solid fa-user-plus"></i>
          <span>Crear cuenta</span>
        </button>
      </div>
    `;

    topbarAuth.innerHTML = `
      <button class="secondary-btn" id="topLoginBtn">
        <i class="fa-solid fa-right-to-bracket"></i>
        <span>Entrar</span>
      </button>

      <button class="primary-btn" id="topRegisterBtn">
        <i class="fa-solid fa-user-plus"></i>
        <span>Registro</span>
      </button>
    `;

    document.getElementById('sidebarLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('sidebarRegisterBtn')?.addEventListener('click', () => openAuthModal('register'));
    document.getElementById('topLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('topRegisterBtn')?.addEventListener('click', () => openAuthModal('register'));

    composerName.textContent = 'Invitado';
    composerSubtitle.textContent = 'Publicación anónima opcional';
    authorNameInput.value = '';
    authorNameInput.disabled = false;
    authorNameInput.classList.remove('hidden');
    renderAvatar(composerAvatar, 'Invitado', null);
  }
}

imageInput.addEventListener('change', (e) => handleFileSelect(e, 'image'));
videoInput.addEventListener('change', (e) => handleFileSelect(e, 'video'));
sendBtn.addEventListener('click', sendMessage);
searchInput.addEventListener('input', renderFeed);

function handleFileSelect(event, type) {
  const files = Array.from(event.target.files || []);

  if (type === 'image') selectedFiles.images = files;
  if (type === 'video') selectedFiles.videos = files;

  mediaPreview.innerHTML = '';

  [...selectedFiles.images, ...selectedFiles.videos].forEach((file) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const isImage = file.type.startsWith('image/');
      const element = document.createElement(isImage ? 'img' : 'video');
      element.src = e.target.result;
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
          throw new Error(data.error || 'Error subiendo archivo');
        }

        resolve(data.url);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}

async function sendMessage() {
  try {
    const content = messageContentInput.value.trim();
    const author = currentUser
      ? currentUser.username
      : (authorNameInput.value.trim() || 'Anónimo');

    if (!content) {
      showToast('Escribe un mensaje', 'error');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin"></i>
      <span>Publicando</span>
    `;

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

    if (!currentUser) authorNameInput.value = '';

    showToast('Mensaje publicado');
    await loadMessages();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = `
      <i class="fa-solid fa-paper-plane"></i>
      <span>Publicar</span>
    `;
  }
}

async function loadMessages() {
  try {
    loading.classList.remove('hidden');

    const response = await fetch(`${API_BASE}/messages`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar los mensajes');
    }

    allMessages = data;
    updateStats();
    renderFeed();
  } catch (error) {
    messagesContainer.innerHTML = `
      <article class="message-card glass-panel">
        Error cargando mensajes.
      </article>
    `;
  } finally {
    loading.classList.add('hidden');
  }
}

function updateStats() {
  let replies = 0;
  let likes = 0;

  allMessages.forEach((msg) => {
    replies += Array.isArray(msg.replies) ? msg.replies.length : 0;
    likes += msg.likes || 0;
  });

  statThreads.textContent = allMessages.length;
  statReplies.textContent = replies;
  statLikes.textContent = likes;
}

function getFilteredMessages() {
  let list = [...allMessages];
  const query = searchInput.value.trim().toLowerCase();

  if (currentFilter === 'trending') {
    list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  if (currentFilter === 'myMessages') {
    if (!currentUser?.id) return [];
    list = list.filter((msg) => String(msg.author?.userId || '') === String(currentUser.id));
  }

  if (query) {
    list = list.filter((msg) => {
      const content = (msg.content || '').toLowerCase();
      const author = (msg.author?.name || '').toLowerCase();
      return content.includes(query) || author.includes(query);
    });
  }

  return list;
}

function renderFeed() {
  const list = getFilteredMessages();

  if (!list.length) {
    messagesContainer.innerHTML = `
      <article class="message-card glass-panel">
        No hay mensajes para mostrar.
      </article>
    `;
    return;
  }

  messagesContainer.innerHTML = '';
  list.forEach((message) => renderMessageCard(message));
}

function renderMessageMedia(message) {
  let html = '';

  if (message.images?.length) {
    html += '<div class="message-media">';
    message.images.forEach((img) => {
      html += `<img src="${img}" alt="Imagen">`;
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
  const article = document.createElement('article');
  article.className = 'message-card glass-panel';

  const authorName = message.author?.name || 'Anónimo';
  const authorAvatar = message.author?.avatar || null;
  const authorUserId = message.author?.userId || null;
  const canEdit =
    currentUser?.id &&
    authorUserId &&
    String(currentUser.id) === String(authorUserId);

  article.innerHTML = `
    <div class="message-header">
      <div class="message-user">
        <div class="message-avatar"></div>

        <div class="message-user-meta">
          <div class="message-user-name">${escapeHtml(authorName)}</div>

          <div class="message-user-sub">
            <span>${timeAgo(message.createdAt)}</span>
            ${message.edited ? '<span>Editado</span>' : ''}
          </div>
        </div>
      </div>

      <div class="message-date">${formatDate(message.createdAt)}</div>
    </div>

    <div class="message-content">${escapeHtml(message.content || '')}</div>

    ${renderMessageMedia(message)}

    <div class="message-actions">
      <button class="action-btn reply-btn">
        <i class="fa-solid fa-reply"></i>
        <span>Responder</span>
      </button>

      <button class="action-btn like-btn">
        <i class="fa-regular fa-heart"></i>
        <span>${message.likes || 0}</span>
      </button>

      ${canEdit ? `
        <button class="action-btn edit-btn">
          <i class="fa-regular fa-pen-to-square"></i>
          <span>Editar</span>
        </button>
      ` : ''}

      ${canEdit ? `
        <button class="action-btn danger delete-btn">
          <i class="fa-regular fa-trash-can"></i>
          <span>Eliminar</span>
        </button>
      ` : ''}
    </div>

    <div class="replies" id="replies-${message._id}"></div>
  `;

  const avatarNode = article.querySelector('.message-avatar');
  const nameNode = article.querySelector('.message-user-name');

  renderAvatar(avatarNode, authorName, authorAvatar);

  if (authorUserId) {
    avatarNode.addEventListener('click', () => goToProfile(authorUserId));
    nameNode.addEventListener('click', () => goToProfile(authorUserId));
  }

  article.querySelector('.reply-btn')?.addEventListener('click', () => showReplyForm(message._id));
  article.querySelector('.like-btn')?.addEventListener('click', () => likeMessage(message._id));
  article.querySelector('.edit-btn')?.addEventListener('click', () => editMessage(message));
  article.querySelector('.delete-btn')?.addEventListener('click', () => deleteMessage(message._id));

  article.querySelectorAll('.message-media img').forEach((img) => {
    img.addEventListener('click', () => window.open(img.src, '_blank'));
  });

  messagesContainer.appendChild(article);
  loadReplies(message._id);
}

async function loadReplies(messageId) {
  try {
    const container = document.getElementById(`replies-${messageId}`);
    if (!container) return;

    const response = await fetch(`${API_BASE}/messages/${messageId}/replies`);
    const data = await response.json();

    if (!response.ok) return;

    container.innerHTML = '';

    data.forEach((reply) => {
      const item = document.createElement('div');
      item.className = 'reply-item';

      const replyName = reply.author?.name || 'Anónimo';
      const replyAvatar = reply.author?.avatar || null;
      const replyUserId = reply.author?.userId || null;

      item.innerHTML = `
        <div class="reply-top">
          <div class="reply-avatar"></div>

          <div>
            <div class="reply-name">${escapeHtml(replyName)}</div>
            <div class="reply-date">${timeAgo(reply.createdAt)}</div>
          </div>
        </div>

        <div class="reply-content">${escapeHtml(reply.content || '')}</div>
      `;

      const avatarNode = item.querySelector('.reply-avatar');
      const nameNode = item.querySelector('.reply-name');

      renderAvatar(avatarNode, replyName, replyAvatar);

      if (replyUserId) {
        avatarNode.addEventListener('click', () => goToProfile(replyUserId));
        nameNode.addEventListener('click', () => goToProfile(replyUserId));
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
      <button class="primary-btn submit-reply-btn">
        <i class="fa-solid fa-paper-plane"></i>
        <span>Responder</span>
      </button>

      <button class="secondary-btn cancel-reply-btn">
        <i class="fa-solid fa-xmark"></i>
        <span>Cancelar</span>
      </button>
    </div>
  `;

  container.prepend(form);

  form.querySelector('.cancel-reply-btn')?.addEventListener('click', () => form.remove());

  form.querySelector('.submit-reply-btn')?.addEventListener('click', async () => {
    try {
      const content = form.querySelector('.reply-content-input').value.trim();
      const guestInput = form.querySelector('.reply-author-input');

      const author = currentUser
        ? currentUser.username
        : (guestInput?.value.trim() || 'Anónimo');

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

    const message = allMessages.find((m) => m._id === messageId);
    if (message) {
      message.likes = data.likes;
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
  const ok = confirm('¿Eliminar este mensaje?');
  if (!ok) return;

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

function goToProfile(userId) {
  if (!userId) return;
  window.location.href = `/profile.html?id=${userId}`;
}

async function init() {
  await loadCurrentUser();
  updateUIFromSession();
  await loadMessages();
}

init();
