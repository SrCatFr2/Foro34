let token = localStorage.getItem('token');
let currentUser = null;
let selectedFiles = { images: [], videos: [] };

// Elementos del DOM
const authModal = document.getElementById('authModal');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const submitAuthBtn = document.getElementById('submitAuth');
const closeBtn = document.querySelector('.close');
const sendBtn = document.getElementById('sendBtn');
const messagesContainer = document.getElementById('messagesContainer');
const authorNameInput = document.getElementById('authorName');
const messageContentInput = document.getElementById('messageContent');
const imageInput = document.getElementById('imageInput');
const videoInput = document.getElementById('videoInput');
const mediaPreview = document.getElementById('mediaPreview');
const switchToRegister = document.getElementById('switchToRegister');

// Eventos
loginBtn.addEventListener('click', () => showAuthModal('login'));
registerBtn.addEventListener('click', () => showAuthModal('register'));
closeBtn.addEventListener('click', () => authModal.classList.add('hidden'));
sendBtn.addEventListener('click', sendMessage);
submitAuthBtn.addEventListener('click', authenticate);
switchToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthModal('register');
});

imageInput.addEventListener('change', (e) => handleFileSelect(e, 'image'));
videoInput.addEventListener('change', (e) => handleFileSelect(e, 'video'));

// Funciones
function showAuthModal(type) {
  const form = document.getElementById('authForm');
  form.innerHTML = type === 'login' ? `
    <h2>Iniciar Sesión</h2>
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Contraseña" required>
    <button id="submitAuth" class="btn-primary">Enviar</button>
    <p>¿No tienes cuenta? <a href="#" id="switchToRegister">Registrarse</a></p>
  ` : `
    <h2>Registrarse</h2>
    <input type="text" id="username" placeholder="Usuario" required>
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Contraseña" required>
    <button id="submitAuth" class="btn-primary">Registrarse</button>
    <p>¿Ya tienes cuenta? <a href="#" id="switchToRegister">Iniciar Sesión</a></p>
  `;
  
  authModal.classList.remove('hidden');
  
  document.getElementById('submitAuth').addEventListener('click', authenticate);
  document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    showAuthModal(type === 'login' ? 'register' : 'login');
  });
}

async function authenticate() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const username = document.getElementById('username')?.value;

  const isRegister = !!username;
  const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
  const data = isRegister ? { username, email, password } : { email, password };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Error en autenticación');

    const result = await response.json();
    token = result.token;
    currentUser = result.user;
    localStorage.setItem('token', token);
    
    authModal.classList.add('hidden');
    updateAuthUI();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function updateAuthUI() {
  const authSection = document.querySelector('.auth-section');
  if (token) {
    authSection.innerHTML = `
      <span>Hola, ${currentUser.username}</span>
      <button id="logoutBtn" class="btn-secondary">Cerrar Sesión</button>
    `;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    authSection.innerHTML = `
      <button id="loginBtn" class="btn-primary">Iniciar Sesión</button>
      <button id="registerBtn" class="btn-secondary">Registrarse</button>
    `;
    loginBtn.addEventListener('click', () => showAuthModal('login'));
    registerBtn.addEventListener('click', () => showAuthModal('register'));
  }
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('token');
  updateAuthUI();
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
      mediaPreview.appendChild(el);
    };
    reader.readAsDataURL(file);
  });
}

async function uploadFile(file) {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
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
        
        if (!response.ok) throw new Error('Error en upload');
        
        const result = await response.json();
        resolve(result.url);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(file);
  });
}

async function sendMessage() {
  const content = messageContentInput.value;
  const author = authorNameInput.value || 'Anónimo';

  if (!content.trim()) {
    alert('Escribe un mensaje');
    return;
  }

  try {
    const images = [];
    const videos = [];

    for (let file of selectedFiles.images) {
      images.push(await uploadFile(file));
    }
    for (let file of selectedFiles.videos) {
      videos.push(await uploadFile(file));
    }

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({
        author,
        content,
        images,
        videos
      })
    });

    if (!response.ok) throw new Error('Error al enviar');

    messageContentInput.value = '';
    authorNameInput.value = '';
    selectedFiles = { images: [], videos: [] };
    mediaPreview.innerHTML = '';
    imageInput.value = '';
    videoInput.value = '';

    loadMessages();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function loadMessages() {
  try {
    const response = await fetch('/api/messages');
    if (!response.ok) throw new Error('Error');
    
    const messages = await response.json();
    messagesContainer.innerHTML = '';
    
    messages.forEach(msg => renderMessage(msg));
  } catch (error) {
    console.error('Error:', error);
  }
}

function renderMessage(message) {
  const div = document.createElement('div');
  div.className = 'message';
  
  const date = new Date(message.createdAt).toLocaleString();
  const canEdit = token && currentUser && currentUser.id === message.author.userId;

  div.innerHTML = `
    <div class="message-header">
      <span class="message-author">${message.author.name}</span>
      <span class="message-time">${date} ${message.edited ? '(editado)' : ''}</span>
    </div>
    <div class="message-content">${escapeHtml(message.content)}</div>
    ${renderMedia(message)}
    <div class="message-actions">
      <button class="btn-small reply-btn" data-id="${message._id}">Responder</button>
      <button class="btn-small like-btn" data-id="${message._id}">👍 ${message.likes}</button>
      ${canEdit ? `
        <button class="btn-small edit-btn" data-id="${message._id}">Editar</button>
        <button class="btn-small delete-btn" data-id="${message._id}">Eliminar</button>
      ` : ''}
    </div>
    <div class="replies" id="replies-${message._id}"></div>
  `;

  messagesContainer.appendChild(div);

  // Cargar respuestas
  if (message.replies && message.replies.length > 0) {
    loadReplies(message._id);
  }

  // Event listeners
  div.querySelector('.reply-btn').addEventListener('click', () => showReplyForm(message._id));
  if (canEdit) {
    div.querySelector('.edit-btn').addEventListener('click', () => editMessage(message._id, message.content));
    div.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(message._id));
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
    const response = await fetch(`/api/messages/${messageId}/replies`);
    if (!response.ok) throw new Error('Error');
    
    const replies = await response.json();
    const repliesContainer = document.getElementById(`replies-${messageId}`);
    
    replies.forEach(reply => {
      const replyDiv = document.createElement('div');
      replyDiv.className = 'reply';
      
      const date = new Date(reply.createdAt).toLocaleString();
      replyDiv.innerHTML = `
        <div class="message-header">
          <span class="message-author">${reply.author.name}</span>
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
    <textarea placeholder="Escribe tu respuesta..." rows="3" class="reply-content"></textarea>
    <button class="btn-small btn-primary submit-reply" data-id="${messageId}">Enviar Respuesta</button>
    <button class="btn-small cancel-reply">Cancelar</button>
  `;
  
  repliesContainer.appendChild(form);
  
  form.querySelector('.submit-reply').addEventListener('click', async () => {
    const author = form.querySelector('.reply-author').value || 'Anónimo';
    const content = form.querySelector('.reply-content').value;
    
    if (!content.trim()) {
      alert('Escribe una respuesta');
      return;
    }

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
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
  const newContent = prompt('Edita tu mensaje:', currentContent);
  if (!newContent) return;

  try {
    const response = await fetch(`/api/messages/${messageId}`, {
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
  if (!confirm('¿Eliminar mensaje?')) return;

  try {
    const response = await fetch(`/api/messages/${messageId}`, {
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

// Cargar mensajes al iniciar
if (token) {
  // Decodificar token para obtener usuario
  const payload = JSON.parse(atob(token.split('.')[1]));
  // Aquí podrías hacer una request para obtener los datos completos del usuario
}

loadMessages();
updateAuthUI();

// Recargar mensajes cada 5 segundos
setInterval(loadMessages, 5000);
