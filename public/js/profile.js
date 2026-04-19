let currentToken = localStorage.getItem('token');
let currentUser = null;
let viewingUserId = null;

const editProfileModal = document.getElementById('editProfileModal');
const closeBtn = document.querySelector('.close');
const editProfileBtn = document.getElementById('editProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editBio = document.getElementById('editBio');
const bioCount = document.getElementById('bioCount');

// Event Listeners
closeBtn?.addEventListener('click', () => closeProfileModal());
editProfileBtn?.addEventListener('click', openEditProfileModal);
saveProfileBtn?.addEventListener('click', saveProfile);
editBio?.addEventListener('input', (e) => {
  bioCount.textContent = `${e.target.value.length}/500`;
});

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  });
});

// Obtener ID del usuario de la URL
const urlParams = new URLSearchParams(window.location.search);
viewingUserId = urlParams.get('id');

async function loadProfile() {
  try {
    let endpoint;
    
    // Si estamos viendo nuestro propio perfil o no hay ID
    if (!viewingUserId || (currentToken && viewingUserId === 'me')) {
      endpoint = '/api/auth/profile';
    } else {
      endpoint = `/api/auth/user/${viewingUserId}`;
    }

    const response = await fetch(endpoint, {
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
    });

    if (!response.ok) throw new Error('No se pudo cargar el perfil');

    const usuario = await response.json();
    currentUser = usuario;

    displayProfile(usuario);
    
    // Mostrar botón de editar solo si es el perfil propio
    if (currentToken && usuario._id === JSON.parse(atob(currentToken.split('.')[1])).userId) {
      editProfileBtn.style.display = 'block';
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function displayProfile(usuario) {
  document.getElementById('profileUsername').textContent = usuario.username;
  document.getElementById('profileBio').textContent = usuario.profile.bio || 'Sin biografía';
  document.getElementById('profileAvatar').src = usuario.profile.avatar;
  
  const location = usuario.profile.location ? `📍 ${usuario.profile.location}` : '';
  const website = usuario.profile.website ? `🔗 <a href="${usuario.profile.website}" target="_blank">${usuario.profile.website}</a>` : '';
  const joinDate = `📅 Se unió ${new Date(usuario.createdAt).toLocaleDateString('es-ES')}`;

  document.getElementById('profileLocation').textContent = location;
  document.getElementById('profileWebsite').innerHTML = website;
  document.getElementById('profileJoinDate').textContent = joinDate;

  // Estadísticas
  document.getElementById('statMessages').textContent = usuario.stats.messageCount || 0;
  document.getElementById('statLikes').textContent = usuario.stats.likes || 0;
  document.getElementById('statFollowers').textContent = usuario.stats.followers || 0;

  // Badges
  const badgesContainer = document.getElementById('badgesContainer');
  if (usuario.badges && usuario.badges.length > 0) {
    badgesContainer.innerHTML = usuario.badges.map(badge => `
      <div class="badge">
        <span>${badge.icon || '🏆'}</span>
        <span>${badge.name}</span>
      </div>
    `).join('');
  }

  // Aplicar color de tema
  document.documentElement.style.setProperty('--primary', getColorByName(usuario.profile.color));

  // Cargar mensajes del usuario
  loadUserMessages(usuario._id);
}

function getColorByName(colorName) {
  const colors = {
    blue: '#667eea',
    purple: '#764ba2',
    pink: '#f093fb',
    green: '#4ade80',
    orange: '#fb923c',
    red: '#ef4444'
  };
  return colors[colorName] || colors.blue;
}

function openEditProfileModal() {
  editBio.value = currentUser.profile.bio || '';
  document.getElementById('editLocation').value = currentUser.profile.location || '';
  document.getElementById('editWebsite').value = currentUser.profile.website || '';

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.color === currentUser.profile.color) {
      btn.classList.add('active');
    }
  });

  editProfileModal.classList.remove('hidden');
}

function closeProfileModal() {
  editProfileModal.classList.add('hidden');
}

async function saveProfile() {
  try {
    const selectedColor = document.querySelector('.color-btn.active');

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        bio: editBio.value,
        location: document.getElementById('editLocation').value,
        website: document.getElementById('editWebsite').value,
        color: selectedColor?.dataset.color || 'blue'
      })
    });

    if (!response.ok) throw new Error('Error al guardar');

    const usuarioActualizado = await response.json();
    currentUser = usuarioActualizado;
    displayProfile(usuarioActualizado);
    closeProfileModal();
    alert('Perfil actualizado');
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function loadUserMessages(userId) {
  try {
    const response = await fetch('/api/messages');
    if (!response.ok) throw new Error('Error');

    const allMessages = await response.json();
    const userMessages = allMessages.filter(msg => msg.author.userId === userId).slice(0, 10);

    const container = document.getElementById('userMessagesContainer');

    if (userMessages.length === 0) {
      container.innerHTML = '<p style="color: var(--text-light);">Este usuario aún no tiene mensajes</p>';
      return;
    }

    container.innerHTML = userMessages.map(msg => `
      <div class="message">
        <div class="message-header">
          <span class="message-author">${msg.author.name}</span>
          <span class="message-time">${new Date(msg.createdAt).toLocaleString('es-ES')}</span>
        </div>
        <div class="message-content">${escapeHtml(msg.content)}</div>
        <div style="font-size: 12px; color: var(--text-light); margin-top: 8px;">
          👍 ${msg.likes} | 💬 ${msg.replies?.length || 0}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error:', error);
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Cargar al iniciar
loadProfile();
