let currentToken = localStorage.getItem('token');
let currentUser = null;
let viewingUserId = null;

const urlParams = new URLSearchParams(window.location.search);
viewingUserId = urlParams.get('id');

async function loadProfile() {
  try {
    let endpoint;
    
    if (!viewingUserId) {
      if (!currentToken) {
        window.location.href = '/';
        return;
      }
      endpoint = '/api/auth/profile';
    } else {
      endpoint = `/api/auth/user/${viewingUserId}`;
    }

    const response = await fetch(endpoint, {
      headers: currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {}
    });

    if (!response.ok) throw new Error('Perfil no encontrado');

    const usuario = await response.json();
    currentUser = usuario;

    displayProfile(usuario);
    updateAuthUI();
  } catch (error) {
    alert('Error: ' + error.message);
    window.location.href = '/';
  }
}

function displayProfile(usuario) {
  const container = document.getElementById('profileContainer');
  const isOwnProfile = currentToken && currentUser.id === JSON.parse(atob(currentToken.split('.')[1])).userId;
  const avatar = usuario.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(usuario.username)}&size=160&background=2563eb&color=fff`;

  const joinDate = new Date(usuario.createdAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  container.innerHTML = `
    <div class="profile-banner"></div>
    
    <div class="profile-header">
      <div class="profile-avatar-container">
        <img src="${avatar}" class="profile-avatar" alt="${usuario.username}">
        ${isOwnProfile ? `
          <button class="profile-avatar-upload" onclick="document.getElementById('avatarInput').click()">
            <i class="fas fa-camera"></i>
          </button>
          <input type="file" id="avatarInput" accept="image/*" hidden onchange="uploadAvatar(event)">
        ` : ''}
      </div>

      <div class="profile-info">
        <div class="profile-name">${usuario.username}</div>
        <div class="profile-email">${usuario.email}</div>
        <div class="profile-bio">${usuario.profile?.bio || 'Sin biografía'}</div>

        <div class="profile-meta">
          ${usuario.profile?.location ? `<div class="profile-meta-item"><i class="fas fa-map-marker-alt"></i> ${usuario.profile.location}</div>` : ''}
          ${usuario.profile?.website ? `<div class="profile-meta-item"><i class="fas fa-globe"></i> <a href="${usuario.profile.website}" target="_blank">${usuario.profile.website}</a></div>` : ''}
          <div class="profile-meta-item"><i class="fas fa-calendar"></i> Se unió ${joinDate}</div>
        </div>

        ${isOwnProfile ? `
          <div class="profile-actions">
            <button class="btn-primary" onclick="openEditModal()">
              <i class="fas fa-edit"></i> Editar Perfil
            </button>
            <button class="btn-secondary" onclick="window.location.href='/'">
              <i class="fas fa-arrow-left"></i> Volver al Foro
            </button>
          </div>
        ` : ''}
      </div>
    </div>

    <div class="profile-stats">
      <div class="profile-stat">
        <div class="profile-stat-number">${usuario.stats.messageCount || 0}</div>
        <div class="profile-stat-label">Mensajes</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-number">${usuario.stats.likes || 0}</div>
        <div class="profile-stat-label">Likes Recibidos</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-number">${usuario.stats.followers || 0}</div>
        <div class="profile-stat-label">Seguidores</div>
      </div>
    </div>

    <div class="profile-messages">
      <h3>Mensajes Recientes</h3>
      <div id="userMessagesContainer" class="messages-grid"></div>
    </div>
  `;

  loadUserMessages(usuario.id);
}

async function loadUserMessages(userId) {
  try {
    const response = await fetch('/api/messages');
    if (!response.ok) return;

    const allMessages = await response.json();
    const userMessages = allMessages.filter(msg => msg.author.userId === userId).slice(0, 5);

    const container = document.getElementById('userMessagesContainer');

    if (userMessages.length === 0) {
      container.innerHTML = '<p style="color: var(--text-light);">No hay mensajes aún</p>';
      return;
    }

    container.innerHTML = userMessages.map(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString();
      return `
        <div class="message-preview">
          <div class="message-preview-content">${msg.content.substring(0, 150)}</div>
          <div class="message-preview-meta">
            <span>${date}</span>
            <span><i class="fas fa-heart"></i> ${msg.likes || 0}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error:', error);
  }
}

function openEditModal() {
  const modal = document.createElement('div');
  modal.className = 'edit-modal';
  modal.id = 'editModal';

  modal.innerHTML = `
    <div class="edit-modal-content">
      <h2>Editar Perfil</h2>

      <div class="form-group">
        <label>Biografía</label>
        <textarea id="editBio" maxlength="500">${currentUser.profile?.bio || ''}</textarea>
        <small style="color: var(--text-light);" id="bioCount">0/500</small>
      </div>

      <div class="form-group">
        <label>Ubicación</label>
        <input type="text" id="editLocation" maxlength="100" value="${currentUser.profile?.location || ''}">
      </div>

      <div class="form-group">
        <label>Sitio Web</label>
        <input type="url" id="editWebsite" value="${currentUser.profile?.website || ''}">
      </div>

      <div class="form-group">
        <label>Color de Tema</label>
        <div class="color-picker">
          <div class="color-option active" data-color="blue" style="background: #2563eb;" onclick="selectColor(this)"></div>
          <div class="color-option" data-color="purple" style="background: #7c3aed;" onclick="selectColor(this)"></div>
          <div class="color-option" data-color="pink" style="background: #ec4899;" onclick="selectColor(this)"></div>
          <div class="color-option" data-color="green" style="background: #10b981;" onclick="selectColor(this)"></div>
        </div>
      </div>

      <div style="display: flex; gap: 12px;">
        <button class="btn-primary btn-large" onclick="saveProfile()">
          <i class="fas fa-save"></i> Guardar Cambios
        </button>
        <button class="btn-secondary btn-large" onclick="closeEditModal()">
          Cancelar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('editBio').addEventListener('input', (e) => {
    document.getElementById('bioCount').textContent = `${e.target.value.length}/500`;
  });
}

function closeEditModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.remove();
}

function selectColor(element) {
  document.querySelectorAll('.color-option').forEach(e => e.classList.remove('active'));
  element.classList.add('active');
}

async function saveProfile() {
  try {
    const bio = document.getElementById('editBio').value;
    const location = document.getElementById('editLocation').value;
    const website = document.getElementById('editWebsite').value;
    const color = document.querySelector('.color-option.active').dataset.color;

    const response = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        bio,
        location,
        website,
        color
      })
    });

    if (!response.ok) throw new Error('Error');

    currentUser = await response.json();
    closeEditModal();
    displayProfile(currentUser);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function uploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: e.target.result,
          type: 'image'
        })
      });

      const result = await response.json();

      const updateResponse = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify({
          avatar: result.url
        })
      });

      if (updateResponse.ok) {
        currentUser = await updateResponse.json();
        displayProfile(currentUser);
      }
    };
    reader.readAsDataURL(file);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function updateAuthUI() {
  const authSection = document.querySelector('#authSection');
  const isOwnProfile = currentToken && currentUser.id === JSON.parse(atob(currentToken.split('.')[1])).userId;

  if (currentToken && isOwnProfile) {
    authSection.innerHTML = `
      <button class="btn-secondary btn-sm" onclick="logout()">
        <i class="fas fa-sign-out-alt"></i> Cerrar Sesión
      </button>
    `;
  }
}

function logout() {
  localStorage.removeItem('token');
  window.location.href = '/';
}

loadProfile();
