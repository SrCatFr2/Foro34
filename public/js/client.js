// === CONFIGURACIÓN ===
const API_BASE = '/api';
let token = localStorage.getItem('token');
let currentUser = null;
let selectedFiles = { images: [], videos: [] };

// === ELEMENTOS DEL DOM ===
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const closeBtn = document.querySelector('.close');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const authorNameInput = document.getElementById('authorName');
const messageContentInput = document.getElementById('messageContent');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const mediaPreview = document.getElementById('mediaPreview');
const loadingDiv = document.getElementById('loading');

// === EVENT LISTENERS ===
loginBtn?.addEventListener('click', () => showAuthModal('login'));
registerBtn?.addEventListener('click', () => showAuthModal('register'));
closeBtn?.addEventListener('click', () => closeAuthModal());
sendBtn?.addEventListener('click', sendMessage);
imageInput?.addEventListener('change', (e) => handleFileSelect(e, 'image'));
videoInput?.addEventListener('change', (e) => handleFileSelect(e, 'video'));

// === FUNCIONES PRINCIPALES ===

function showAuthModal(type) {
  const form = document.getElementById('authForm');

  if (type === 'login') {
    form.innerHTML = `
      <h2>Iniciar Sesión</h2>
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Contraseña" required>
      <button id="submitAuth" class="btn-primary btn-large">Enviar</button>
      <p>¿No tienes cuenta? <a href="#" id="switchToRegister" onclick="event.preventDefault(); showAuthModal('register')">Registrarse</a></p>
    `;
  } else {
    form.innerHTML = `
      <h2>Registrarse</h2>
      <input type="text" id="username" placeholder="Usuario" required>
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Contraseña (mín. 6 caracteres)" required>
      <button id="submitAuth" class="btn-primary btn-large">Registrarse</button>
      <p>¿Ya tienes cuenta? <a href="#" id="switchToRegister" onclick="event.preventDefault(); showAuthModal('login')">Iniciar Sesión</a></p>
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
    alert('¡Bienvenido ' + (currentUser.username || currentUser.email) + '!');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function updateAuthUI() {
  const authSection = document.querySelector('.auth-section');

  if (token && currentUser) {
    authSection.innerHTML = `
      <span style="color: var(--text); font-weight: 600;">👤 ${currentUser.username || currentUser.email}</span>
      <button id="logoutBtn" class="btn-secondary">Cerrar Sesión</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    authSection.innerHTML = `
      <button id="loginBtn" class="btn-primary">Iniciar Sesión</button>
      <button id="registerBtn" class="btn-secondary">Registrarse</button>
    `;
    document.getElementById('loginBtn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('registerBtn').addEventListener('click', () => showAuthModal('register'));
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
  alert('Sesión cerrada');
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
    const author = authorNameInput.value.trim() || 'Anónimo';

    if (!content) {
      alert('Por favor escribe un mensaje');
      return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = 'Enviando...';

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
    authorNameInput.value = '';
    selectedFiles = { images: [], videos: [] };
    mediaPreview.innerHTML = '';
    imageInput.value = '';
    videoInput.value = '';

    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Publicar Mensaje';
  }
}

async function loadMessages() {
  try {
    loadingDiv.classList.remove('hidden');
    const response = await fetch(`${API_BASE}/messages`);

    if (!response.ok) throw new Error('Error al cargar mensajes');

    const messages = await response.json();
    messagesContainer.innerHTML = '';

    if (messages.length === 0) {
      messagesContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">Aún no hay mensajes. ¡Sé el primero en escribir!</p>';
    } else {
      messages.forEach(msg => renderMessage(msg));
    }
  } catch (error) {
    console.error('Error:', error);
    messagesContainer.innerHTML = '<p style="color: var(--danger);">Error al cargar los mensajes</p>';
  } finally {
    loadingDiv.classList.add('hidden');
  }
}

function renderMessage(message) {
  const div = document.createElement('div');
  div.className = 'message';

  const date = new Date(message.createdAt).toLocaleString('es-ES');
  const canEdit = token && currentUser && currentUser.id === message.author.userId;

  let actionsHTML = `
    <button class="btn-small reply-btn" data-id="${message._id}">💬 Responder</button>
    <button class="btn-small like-btn" data-id="${message._id}">👍 ${message.likes || 0}</button>
  `;

  if (canEdit) {
    actionsHTML += `
      <button class="btn-small edit-btn" data-id="${message._id}">✏️ Editar</button>
      <button class="btn-small delete-btn" data-id="${message._id}">🗑️ Eliminar</button>
    `;
  }

  div.innerHTML = `
    <div class="message-header">
      <span class="message-author">${escapeHtml(message.author.name)}</span>
      <span class="message-time">${date}${message.edited ? ' (editado)' : ''}</span>
    </div>
    <div class="message-content">${escapeHtml(message.content)}</div>
    ${renderMedia(message)}
    <div class="message-actions">
      ${actionsHTML}
    </div>
    <div class="replies" id="replies-${message._id}"></div>
  `;

  messagesContainer.appendChild(div);

  // Event listeners
  div.querySelector('.reply-btn').addEventListener('click', () => showReplyForm(message._id));
  div.querySelector('.like-btn').addEventListener('click', () => likeMessage(message._id));

  if (canEdit) {
    div.querySelector('.edit-btn').addEventListener('click', () => editMessage(message._id, message.content));
    div.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(message._id));
  }

  // Cargar respuestas
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

async function loadReplies(messageId) {
  try {
    const response = await fetch(`${API_BASE}/messages/${messageId}/replies`);
    if (!response.ok) throw new Error('Error');

    const replies = await response.json();
    const repliesContainer = document.getElementById(`replies-${messageId}`);

    replies.forEach(reply => {
      const replyDiv = document.createElement('div');
      replyDiv.className = 'reply';

      const date = new Date(reply.createdAt).toLocaleString('es-ES');
      replyDiv.innerHTML = `
        <div class="message-header">
          <span class="message-author">${escapeHtml(reply.author.name)}</span>
          <span class="message-time">${date}</span>
        </div>
        <div class="message-content">${escapeHtml(reply.content)}</div>
        ${renderMedia(reply)}
      `;

      repliesContainer.appendChild(replyDiv);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

function showReplyForm(messageId) {
  const repliesContainer = document.getElementById(`replies-${messageId}`);

  const form = document.createElement('div');
  form.className = 'reply-form';
  form.innerHTML = `
    <input type="text" placeholder="Tu nombre" class="reply-author" maxlength="50">
    <textarea placeholder="Escribe tu respuesta..." rows="3" class="reply-content" maxlength="5000"></textarea>
    <div style="display: flex; gap: 10px;">
      <button class="btn-small btn-primary submit-reply" data-id="${messageId}">Enviar</button>
      <button class="btn-small cancel-reply">Cancelar</button>
    </div>
  `;

  repliesContainer.appendChild(form);

  form.querySelector('.submit-reply').addEventListener('click', async () => {
    const author = form.querySelector('.reply-author').value.trim() || 'Anónimo';
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
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          author,
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
  if (!token) {
    alert('Debes iniciar sesión para eliminar');
    return;
  }

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

    loadMessages();
  } catch (error) {
    console.error('Error:', error);
  }
}

// === INICIALIZACIÓN ===
if (token) {
  updateAuthUI();
}

loadMessages();
updateAuthUI();

// Recargar mensajes cada 8 segundos
setInterval(loadMessages, 8000);
