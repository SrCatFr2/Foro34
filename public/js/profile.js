const API_BASE = '/api';

let token = localStorage.getItem('token');
let currentUser = null;
let viewedUser = null;

const params = new URLSearchParams(window.location.search);
const viewedUserId = params.get('id');

const profileTopActions = document.getElementById('profileTopActions');
const profileCover = document.getElementById('profileCover');
const profileAvatar = document.getElementById('profileAvatar');
const profileUsername = document.getElementById('profileUsername');
const profileEmail = document.getElementById('profileEmail');
const profileBio = document.getElementById('profileBio');
const profileLocation = document.getElementById('profileLocation');
const profileWebsite = document.getElementById('profileWebsite');
const profileJoinDate = document.getElementById('profileJoinDate');
const profileStats = document.getElementById('profileStats');
const profileActions = document.getElementById('profileActions');
const userMessagesContainer = document.getElementById('userMessagesContainer');
const profileAvatarUploadLabel = document.getElementById('profileAvatarUploadLabel');
const profileAvatarInput = document.getElementById('profileAvatarInput');
const editProfileModal = document.getElementById('editProfileModal');
const closeEditProfileBtn = document.getElementById('closeEditProfileBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const editBio = document.getElementById('editBio');
const editLocation = document.getElementById('editLocation');
const editWebsite = document.getElementById('editWebsite');
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.textContent = message;
  toastContainer.appendChild(item);

  setTimeout(() => item.remove(), 2600);
}

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function canvasAvatar(name = 'U', size = 180, colorA = '#4f7cff', colorB = '#7a5cff') {
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

  const initial = (name || 'U').charAt(0).toUpperCase();
  ctx.fillStyle = '#fff';
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
  return avatar || canvasAvatar(name);
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

    const data = await response.json();
    data.id = getUserId(data);
    currentUser = data;
  } catch {
    token = null;
    localStorage.removeItem('token');
    currentUser = null;
  }
}

async function loadViewedUser() {
  try {
    const endpoint = viewedUserId
      ? `${API_BASE}/auth/user/${viewedUserId}`
      : `${API_BASE}/auth/profile`;

    const response = await fetch(endpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo cargar el perfil');
    }

    data.id = getUserId(data);
    viewedUser = data;
  } catch (error) {
    showToast(error.message, 'error');
    setTimeout(() => {
      window.location.href = '/';
    }, 1200);
  }
}

function isOwnProfile() {
  return currentUser?.id && viewedUser?.id && String(currentUser.id) === String(viewedUser.id);
}

function renderTopActions() {
  if (currentUser) {
    profileTopActions.innerHTML = `
      <button class="secondary-btn" id="goHomeBtn">Inicio</button>
      <button class="secondary-btn" id="logoutBtn">Salir</button>
    `;

    document.getElementById('goHomeBtn').addEventListener('click', () => {
      window.location.href = '/';
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = '/';
    });
  } else {
    profileTopActions.innerHTML = `<a href="/" class="secondary-btn">Inicio</a>`;
  }
}

function renderProfile() {
  if (!viewedUser) return;

  const avatar = getAvatarUrl(viewedUser.username, viewedUser.profile?.avatar);

  profileCover.style.background = `
    radial-gradient(circle at top left, rgba(255,255,255,0.22), transparent 22%),
    linear-gradient(135deg, #4f7cff, #7a5cff)
  `;

  profileAvatar.innerHTML = `<img src="${avatar}" alt="${escapeHtml(viewedUser.username)}">`;
  profileUsername.textContent = viewedUser.username || 'Usuario';
  profileEmail.textContent = viewedUser.email || '';
  profileBio.textContent = viewedUser.profile?.bio || 'Sin biografía todavía';

  profileLocation.textContent = viewedUser.profile?.location ? `Ubicación: ${viewedUser.profile.location}` : '';
  profileWebsite.innerHTML = viewedUser.profile?.website
    ? `Web: <a href="${viewedUser.profile.website}" target="_blank" rel="noopener noreferrer">${viewedUser.profile.website}</a>`
    : '';

  profileJoinDate.textContent = viewedUser.createdAt
    ? `Se unió: ${new Date(viewedUser.createdAt).toLocaleDateString('es-ES')}`
    : '';

  profileStats.innerHTML = `
    <div class="profile-stat">
      <strong>${viewedUser.stats?.messageCount || 0}</strong>
      <span>Mensajes</span>
    </div>
    <div class="profile-stat">
      <strong>${viewedUser.stats?.likes || 0}</strong>
      <span>Likes recibidos</span>
    </div>
    <div class="profile-stat">
      <strong>${viewedUser.stats?.followers || 0}</strong>
      <span>Seguidores</span>
    </div>
  `;

  if (isOwnProfile()) {
    profileActions.innerHTML = `
      <button class="primary-btn" id="openEditProfileBtn">Editar perfil</button>
    `;

    document.getElementById('openEditProfileBtn').addEventListener('click', openEditModal);
    profileAvatarUploadLabel.classList.remove('hidden');
  } else {
    profileActions.innerHTML = '';
    profileAvatarUploadLabel.classList.add('hidden');
  }
}

async function loadUserMessages() {
  if (!viewedUser?.id) return;

  try {
    const response = await fetch(`${API_BASE}/messages/user/${viewedUser.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudieron cargar los mensajes');
    }

    if (!data.length) {
      userMessagesContainer.innerHTML = `
        <div class="profile-message-item">Este usuario aún no tiene mensajes públicos.</div>
      `;
      return;
    }

    userMessagesContainer.innerHTML = data
      .map((msg) => {
        return `
          <article class="profile-message-item">
            <div>${escapeHtml(msg.content)}</div>
            <div class="meta">
              ${new Date(msg.createdAt).toLocaleString('es-ES')} · ${msg.likes || 0} likes
            </div>
          </article>
        `;
      })
      .join('');
  } catch (error) {
    userMessagesContainer.innerHTML = `
      <div class="profile-message-item">No se pudieron cargar los mensajes.</div>
    `;
  }
}

function openEditModal() {
  editBio.value = viewedUser.profile?.bio || '';
  editLocation.value = viewedUser.profile?.location || '';
  editWebsite.value = viewedUser.profile?.website || '';
  editProfileModal.classList.remove('hidden');
}

function closeEditModal() {
  editProfileModal.classList.add('hidden');
}

closeEditProfileBtn.addEventListener('click', closeEditModal);

saveProfileBtn.addEventListener('click', async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        bio: editBio.value.trim(),
        location: editLocation.value.trim(),
        website: editWebsite.value.trim()
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'No se pudo guardar el perfil');
    }

    data.id = getUserId(data);
    currentUser = data;
    viewedUser = data;

    renderProfile();
    closeEditModal();
    showToast('Perfil actualizado');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

profileAvatarInput.addEventListener('change', async (event) => {
  try {
    const file = event.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);

    const uploadRes = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: base64,
        type: 'image'
      })
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(uploadData.error || 'No se pudo subir la imagen');
    }

    const updateRes = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        avatar: uploadData.url
      })
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      throw new Error(updateData.error || 'No se pudo actualizar el avatar');
    }

    updateData.id = getUserId(updateData);
    currentUser = updateData;
    viewedUser = updateData;
    renderProfile();
    showToast('Foto de perfil actualizada');
  } catch (error) {
    showToast(error.message, 'error');
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function init() {
  await loadCurrentUser();
  await loadViewedUser();
  renderTopActions();
  renderProfile();
  await loadUserMessages();
}

init();
