// === CONFIGURACIÓN ===
const API_BASE = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let selectedFiles = { images: [], videos: [] };
let currentFilter = 'recent';
let allMessages = [];

// === ELEMENTOS DEL DOM ===
const authModal = document.getElementById('authModal');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const authorNameInput = document.getElementById('authorName');
const messageContentInput = document.getElementById('messageContent');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const mediaPreview = document.getElementById('mediaPreview');
const loadingDiv = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');

// === EVENT LISTENERS ===
sendBtn?.addEventListener('click', sendMessage);
imageInput?.addEventListener('change', (e) => handleFileSelect(e, 'image'));
videoInput?.addEventListener('change', (e) => handleFileSelect(e, 'video'));
searchInput?.addEventListener('input', handleSearch);

// Filtros
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentFilter = e.currentTarget.dataset.filter;
    displayMessages();
  });
});

// === FUNCIONES PRINCIPALES ===

function showAuthModal(type) {
  const form = document.getElementById('authForm');

  if (type === 'login') {
    form.innerHTML = `
      <h2>Iniciar Sesión</h2>
      <input type="email" id="email" placeholder="Correo electrónico" required>
      <input type="password" id="password" placeholder="Contraseña" required>
      <button id="submitAuth" class="btn-primary btn-large">
        <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
      </button>
      <p>¿No tienes cuenta? <a href="#" onclick="event.preventDefault(); showAuthModal('register')">Crear una</a></p>
    `;
  } else {
    form.innerHTML = `
      <h2>Crear Cuenta</h2>
      <input type="text" id="username" placeholder="Nombre de usuario" required>
      <input type="email" id="email" placeholder="Correo electrónico" required>
      <input type="password" id="password" placeholder="Contraseña (mín. 6)" required>
      <button id="submitAuth" class="btn-primary btn-large">
        <i class="fas fa-user-plus"></i> Registrarse
      </button>
      <p>¿Ya tienes cuenta? <a href="#" onclick="event.preventDefault(); showAuthModal('login')">Inicia sesión</a></p>
    `;
  }

  authModal.classList.remove('hidden');
  document.getElementById('submitAuth').addEventListener('click', authenticate);
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

async function authenticate() {
  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const username = document.getElementById('username')?.value.trim();

    if (!email || !password) {
      alert('Por favor completa todos los campos');
      return;
    }

    const isRegister = !!username;
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const data = isRegister ? { username, email, password } : { email, password };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Error en autenticación');
    }

    token = result.token;
    currentUser = result.user;
    localStorage.setItem('token', token);

    closeAuthModal();
    updateAuthUI();
    updateAuthorNameInput();
    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function updateAuthUI() {
  const authSection = document.querySelector('#authSection');

  if (token && currentUser) {
    const avatar = currentUser.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=2563eb&color=fff`;
    
    authSection.innerHTML = `
      <div class="user-profile">
        <div class="user-profile-avatar">
          <img src="${avatar}" alt="${currentUser.username}">
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--text-primary); font-size: 14px;">${currentUser.username}</div>
          <span>${currentUser.email}</span>
        </div>
      </div>
      <button class="btn-secondary btn-sm" onclick="goToMyProfile()">
        <i class="fas fa-user"></i> Perfil
      </button>
      <button class="btn-secondary btn-sm" id="logoutBtn">
        <i class="fas fa-sign-out-alt"></i> Salir
      </button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    authSection.innerHTML = `
      <button class="btn-primary btn-sm" onclick="showAuthModal('login')">
        <i class="fas fa-sign-in-alt"></i> Iniciar
      </button>
      <button class="btn-secondary btn-sm" onclick="showAuthModal('register')">
        <i class="fas fa-user-plus"></i> Registro
      </button>
    `;
  }
}

function updateAuthorNameInput() {
  if (token && currentUser) {
    authorNameInput.value = currentUser.username;
    authorNameInput.disabled = true;
    authorNameInput.style.opacity = '0.6';
  } else {
    authorNameInput.value = '';
    authorNameInput.disabled = false;
    authorNameInput.style.opacity = '1';
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
  updateAuthorNameInput();
  loadMessages();
}

function handleFileSelect(e, type) {
  const files = Array.from(e.target.files);
  selectedFiles[type === 'image' ? 'images' : 'videos'] = files;

  mediaPreview.innerHTML = '';

  [...selectedFiles.images, ...selectedFiles.videos].forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const isImage = file.type.startsWith('image');
      const el = document.createElement(isImage ? 'img' : 'video');
      el.src = event.target.result;
      if (!isImage) el.controls = true;
      mediaPreview.appendChild(el);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: event.target.result,
            type: file.type.startsWith('image') ? 'image' : 'video'
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error al subir archivo');
        }

        resolve(result.url);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
    reader.readAsDataURL(file);
  });
}

async function sendMessage() {
  try {
    const content = messageContentInput.value.trim();
    let author = '';

    if (token && currentUser) {
      author = currentUser.username;
    } else {
      author = authorNameInput.value.trim() || 'Anónimo';
    }

    if (!content) {
      alert('Por favor escribe un mensaje');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    const images = [];
    const videos = [];

    for (let file of selectedFiles.images) {
      try {
        const url = await uploadFile(file);
        images.push(url);
      } catch (error) {
        console.error('Error subiendo imagen:', error);
      }
    }

    for (let file of selectedFiles.videos) {
      try {
        const url = await uploadFile(file);
        videos.push(url);
      } catch (error) {
        console.error('Error subiendo video:', error);
      }
    }

    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        author,
        content,
        images,
        videos
      })
    });

    if (!response.ok) {
      throw new Error('Error al enviar mensaje');
    }

    messageContentInput.value = '';
    if (!token) authorNameInput.value = '';
    selectedFiles = { images: [], videos: [] };
    mediaPreview.innerHTML = '';
    imageInput.value = '';
    videoInput.value = '';

    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publicar Mensaje';
  }
}

async function loadMessages() {
  try {
    loadingDiv.classList.remove('hidden');
    const response = await fetch(`${API_BASE}/messages`);

    if (!response.ok) throw new Error('Error al cargar mensajes');

    allMessages = await response.json();
    displayMessages();
  } catch (error) {
    console.error('Error:', error);
    messagesContainer.innerHTML = '<p style="color: var(--danger); text-align: center;">Error al cargar los mensajes</p>';
  } finally {
    loadingDiv.classList.add('hidden');
  }
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  displayMessages(query);
}

function displayMessages(searchQuery = '') {
  messagesContainer.innerHTML = '';

  let messagesToDisplay = [];

  switch (currentFilter) {
    case 'trending':
      messagesToDisplay = [...allMessages].sort((a, b) => b.likes - a.likes);
      break;
    case 'myMessages':
      if (token && currentUser) {
        messagesToDisplay = allMessages.filter(msg => msg.author.userId === currentUser.id);
      }
      break;
    default:
      messagesToDisplay = allMessages;
  }

  if (searchQuery) {
    messagesToDisplay = messagesToDisplay.filter(msg =>
      msg.content.toLowerCase().includes(searchQuery) ||
      msg.author.name.toLowerCase().includes(searchQuery)
    );
  }

  if (messagesToDisplay.length === 0) {
    messagesContainer.innerHTML = '<p style="text-align: center; color: var(--text-light); padding: 40px;">No hay mensajes</p>';
    return;
  }

  messagesToDisplay.forEach(msg => renderMessage(msg));
}

function renderMessage(message) {
  const div = document.createElement('div');
  div.className = 'message-card';

  const date = new Date(message.createdAt);
  const timeAgo = getTimeAgo(date);
  const canEdit = token && currentUser && currentUser.id === message.author.userId;

  const avatar = message.author.userId 
    ? (currentUser?.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.author.name)}&background=2563eb&color=fff`)
    : `https://ui-avatars.com/api/?name=A&background=94a3b8&color=fff`;

  let actionsHTML = `
    <button class="action-btn" onclick="replyMessage('${message._id}')">
      <i class="fas fa-reply"></i> Responder
    </button>
    <button class="action-btn" onclick="likeMessage('${message._id}')">
      <i class="fas fa-heart"></i> ${message.likes || 0}
    </button>
  `;

  if (canEdit) {
    actionsHTML += `
      <button class="action-btn" onclick="editMessage('${message._id}', \`${escapeQuotes(message.content)}\`)">
        <i class="fas fa-edit"></i> Editar
      </button>
      <button class="action-btn btn-danger" onclick="deleteMessage('${message._id}')">
        <i class="fas fa-trash"></i> Eliminar
      </button>
    `;
  }

  div.innerHTML = `
    <div class="message-header">
      <div class="message-author-info">
        <div class="message-avatar" onclick="message.author.userId && goToProfile('${message.author.userId}')">
          <img src="${avatar}" alt="${message.author.name}">
        </div>
        <div class="message-author-details">
          <div class="message-author-name" onclick="message.author.userId && goToProfile('${message.author.userId}')">
            ${escapeHtml(message.author.name)}
          </div>
          <div class="message-meta">
            ${message.edited ? '<span style="margin-right: 8px;">(editado)</span>' : ''}
            <span>${timeAgo}</span>
          </div>
        </div>
      </div>
      <div class="message-time">${date.toLocaleDateString()}</div>
    </div>
    <div class="message-content">${escapeHtml(message.content)}</div>
    ${renderMedia(message)}
    <div class="message-actions">
      ${actionsHTML}
    </div>
    <div class="replies" id="replies-${message._id}"></div>
  `;

  messagesContainer.appendChild(div);

  if (message.replies && message.replies.length > 0) {
    loadReplies(message._id);
  }
}

function renderMedia(message) {
  let html = '';

  if (message.images && message.images.length > 0) {
    html += '<div class="message-media">';
    message.images.forEach(img => {
      html += `<img src="${img}" alt="Imagen" onclick="window.open('${img}')">`;
    });
    html += '</div>';
  }

  if (message.videos && message.videos.length > 0) {
    html += '<div class="message-media">';
    message.videos.forEach(vid => {
      html += `<video controls><source src="${vid}"></video>`;
    });
    html += '</div>';
  }

  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeQuotes(text) {
  return text.replace(/`/g, '\\`');
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

async function loadReplies(messageId) {
  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}/replies`);
    if (!response.ok) return;

    const replies = await response.json();
    const repliesContainer = document.getElementById(`replies-${messageId}`);

    replies.forEach(reply => {
      const replyDiv = document.createElement('div');
      replyDiv.className = 'reply-item';

      const avatar = reply.author.userId 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.author.name)}&background=2563eb&color=fff`
        : `https://ui-avatars.com/api/?name=A&background=94a3b8&color=fff`;

      replyDiv.innerHTML = `
        <div style="display: flex; gap: 8px;">
          <img src="${avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 13px; color: var(--text-primary);">
              ${escapeHtml(reply.author.name)}
            </div>
            <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 4px;">
              ${getTimeAgo(new Date(reply.createdAt))}
            </div>
            <div style="color: var(--text-primary); font-size: 13px;">
              ${escapeHtml(reply.content)}
            </div>
          </div>
        </div>
      `;

      repliesContainer.appendChild(replyDiv);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function replyMessage(messageId) {
  if (!token) {
    alert('Debes iniciar sesión para responder');
    return;
  }

  const repliesContainer = document.getElementById(`replies-${messageId}`);
  const form = document.createElement('div');
  form.className = 'reply-form';
  
  form.innerHTML = `
    <textarea placeholder="Escribe tu respuesta..." rows="2" class="reply-content" maxlength="5000"></textarea>
    <div style="display: flex; gap: 8px;">
      <button class="btn-primary btn-sm submit-reply" data-id="${messageId}">
        <i class="fas fa-send"></i> Enviar
      </button>
      <button class="btn-secondary btn-sm cancel-reply">Cancelar</button>
    </div>
  `;

  repliesContainer.appendChild(form);

  form.querySelector('.submit-reply').addEventListener('click', async () => {
    const content = form.querySelector('.reply-content').value.trim();

    if (!content) {
      alert('Escribe una respuesta');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          author: currentUser.username,
          content,
          parentId: messageId
        })
      });

      if (!response.ok) throw new Error('Error');

      form.remove();
      loadReplies(messageId);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  });

  form.querySelector('.cancel-reply').addEventListener('click', () => form.remove());
}

async function editMessage(messageId, currentContent) {
  if (!token) {
    alert('Debes iniciar sesión para editar');
    return;
  }

  const newContent = prompt('Edita tu mensaje:', currentContent);
  if (!newContent) return;

  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: newContent })
    });

    if (!response.ok) throw new Error('Error');

    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function deleteMessage(messageId) {
  if (!confirm('¿Eliminar este mensaje?')) return;

  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Error');

    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function likeMessage(messageId) {
  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}/like`, {
      method: 'POST'
    });

    if (!response.ok) throw new Error('Error');

    const message = allMessages.find(m => m._id === messageId);
    if (message) {
      message.likes++;
      displayMessages();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function goToProfile(userId) {
  if (userId) {
    window.location.href = `/profile.html?id=${userId}`;
  }
}

function goToMyProfile() {
  window.location.href = '/profile.html';
}

// === INICIALIZACIÓN ===
async function initializeApp() {
  if (token) {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        currentUser = await response.json();
      } else {
        token = null;
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      token = null;
      localStorage.removeItem('token');
    }
  }

  updateAuthUI();
  updateAuthorNameInput();
  loadMessages();
}

initializeApp();

// Recargar mensajes cada 10 segundos
setInterval(loadMessages, 10000);
