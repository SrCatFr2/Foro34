let token = localStorage.getItem('token');
let currentUser = null;
let viewingUserId = new URLSearchParams(window.location.search).get('id');

async function loadProfile() {
  try {
    let endpoint = viewingUserId 
      ? `/api/auth/user/${viewingUserId}`
      : '/api/auth/profile';

    const response = await fetch(endpoint, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      window.location.href = '/';
      return;
    }

    currentUser = await response.json();
    displayProfile();
  } catch (error) {
    console.error('Error:', error);
    window.location.href = '/';
  }
}

async function displayProfile() {
  const isOwn = token && !viewingUserId;
  const avatar = currentUser.profile?.avatar || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username)}&background=6366f1&color=fff&size=120`;

  document.getElementById('profileName').textContent = currentUser.username;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileBio').textContent = currentUser.profile?.bio || 'Sin biografía';

  // Avatar
  const avatarEl = document.querySelector('.profile-avatar-large');
  avatarEl.innerHTML = `<img src="${avatar}">`;

  // Stats
  document.getElementById('profileStats').innerHTML = `
    <div class="profile-stat">
      <div class="profile-stat-value">${currentUser.stats.messageCount || 0}</div>
      <div class="profile-stat-label">Posts</div>
    </div>
    <div class="profile-stat">
      <div class="profile-stat-value">${currentUser.stats.likes || 0}</div>
      <div class="profile-stat-label">Likes</div>
    </div>
    <div class="profile-stat">
      <div class="profile-stat-value">${currentUser.stats.followers || 0}</div>
      <div class="profile-stat-label">Seguidores</div>
    </div>
  `;

  // Actions
  if (isOwn) {
    document.getElementById('profileActions').innerHTML = `
      <button class="btn-primary" onclick="editProfile()">
        <i class="fas fa-edit"></i> Editar
      </button>
      <button class="btn-secondary" onclick="window.location.href='/'">
        <i class="fas fa-home"></i> Inicio
      </button>
    `;
  } else {
    document.getElementById('profileActions').innerHTML = `
      <button class="btn-secondary" onclick="window.location.href='/'">
        <i class="fas fa-arrow-left"></i> Volver
      </button>
    `;
  }

  // Messages
  try {
    const response = await fetch('/api/messages');
    const messages = await response.json();
    const userMessages = messages
      .filter(m => m.author.userId === currentUser.id)
      .slice(0, 5);

    if (userMessages.length > 0) {
      document.getElementById('profileMessages').innerHTML = `
        <h3>Últimos Posts</h3>
        ${userMessages.map(m => `
          <div class="message-item">${m.content.substring(0, 60)}...</div>
        `).join('')}
      `;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

function editProfile() {
  alert('Edición de perfil próximamente');
}

loadProfile();
