import { API } from './api.js';

// Application State
const state = {
  currentUser: null,
  guilds: [],
  filteredGuilds: [],
  currentGuildId: null,
  currentGuildData: null,
  casesPage: 1,
  casesTotalPages: 1
};

// UI Notification Toast
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconSvg = type === 'success'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fb7185" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;

  toast.innerHTML = `
    <span style="display: flex; align-items: center; justify-content: center;">${iconSvg}</span>
    <span style="font-size: 0.9rem; font-weight: 500;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Modal Helpers
function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add('active');
}

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.remove('active');
}

// Initialize Application
async function initApp() {
  try {
    // 1. Check Authentication
    const [authData, stats] = await Promise.all([
      API.getMe(),
      API.getStats().catch(() => null)
    ]);

    if (!authData.isAuthenticated || !authData.user) {
      window.location.href = '/auth/login';
      return;
    }

    state.currentUser = authData.user;
    renderUserNav(authData.user);

    // Update brand avatar with real bot avatar
    if (stats && stats.avatar) {
      const brandAvatar = document.getElementById('bot-avatar-brand');
      const favicon = document.getElementById('favicon');
      if (brandAvatar) brandAvatar.src = stats.avatar;
      if (favicon) favicon.href = stats.avatar;
    }

    // 2. Setup Global Listeners
    setupGlobalListeners();

    // 3. Check URL query for guild selection
    const urlParams = new URLSearchParams(window.location.search);
    const guildIdParam = urlParams.get('guild');

    if (guildIdParam) {
      await selectGuild(guildIdParam);
    } else {
      await loadGuildsList();
    }
  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Error al inicializar la sesión', 'error');
  }
}

// Render User Profile in Navbar
function renderUserNav(user) {
  const container = document.getElementById('user-menu-container');
  if (!container) return;

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';

  container.innerHTML = `
    <div class="user-badge">
      <img class="user-avatar" src="${avatarUrl}" alt="Avatar">
      <span class="user-name">${user.globalName || user.username}</span>
      <a href="/auth/logout" class="btn btn-secondary btn-sm" style="margin-left: 8px;">Salir</a>
    </div>
  `;
}


// Global Event Listeners
function setupGlobalListeners() {
  // Breadcrumb / Brand link
  document.getElementById('brand-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showGuildsSelector();
  });

  document.getElementById('btn-back-to-servers')?.addEventListener('click', () => {
    showGuildsSelector();
  });

  // Server search input
  const searchInput = document.getElementById('server-search-input');
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    state.filteredGuilds = state.guilds.filter(g => g.name.toLowerCase().includes(q));
    renderGuildsGrid();
  });

  // Modal Closers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  // Close modals clicking outside
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.classList.remove('active');
    });
  });

  // Tabs switching
  document.querySelectorAll('.tab-btn').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const targetPaneId = tabBtn.getAttribute('data-tab');

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tabBtn.classList.add('active');
      document.getElementById(targetPaneId)?.classList.add('active');
    });
  });
}

// =========================================================================
// VIEW 1: GUILD SELECTOR
// =========================================================================

async function loadGuildsList() {
  showGuildsSelector();
  const loading = document.getElementById('guilds-loading');
  const grid = document.getElementById('server-grid');

  loading.style.display = 'block';
  grid.style.display = 'none';

  try {
    const data = await API.getGuilds();
    state.guilds = data.guilds || [];
    state.filteredGuilds = [...state.guilds];
    renderGuildsGrid();
  } catch (err) {
    showToast(err.message || 'Error cargando servidores', 'error');
  } finally {
    loading.style.display = 'none';
    grid.style.display = 'grid';
  }
}

function showGuildsSelector() {
  document.getElementById('view-guild-selector').style.display = 'block';
  document.getElementById('view-guild-hub').style.display = 'none';
  document.getElementById('breadcrumb-container').innerHTML = '';
  history.pushState(null, '', '/dashboard');
  state.currentGuildId = null;
}

function renderGuildsGrid() {
  const grid = document.getElementById('server-grid');
  if (!grid) return;

  if (state.filteredGuilds.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-secondary);">
        <p>No se encontraron servidores donde tengas permisos de administración.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = state.filteredGuilds.map(guild => {
    const avatar = guild.icon
      ? `<img class="server-avatar" src="${guild.icon}" alt="${guild.name}">`
      : `<div class="server-avatar">${guild.name.charAt(0).toUpperCase()}</div>`;

    const statusBadge = guild.botInGuild
      ? `<span class="server-badge badge-active">● Activo en servidor</span>`
      : `<span class="server-badge badge-inactive">○ No instalado</span>`;

    const actionBtn = guild.botInGuild
      ? `<button class="btn btn-primary btn-sm btn-select-guild" data-id="${guild.id}">Configurar Servidor</button>`
      : `<a href="https://discord.com/oauth2/authorize?client_id=1550403576990531755&permissions=1099511627775&scope=bot%20applications.commands&guild_id=${guild.id}" target="_blank" class="btn btn-secondary btn-sm">Invitar a Cosmic</a>`;

    return `
      <div class="server-card">
        <div class="server-info">
          ${avatar}
          <div>
            <h3 class="server-name" title="${guild.name}">${guild.name}</h3>
            ${statusBadge}
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end;">
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');

  // Attach button click handlers
  grid.querySelectorAll('.btn-select-guild').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      selectGuild(id);
    });
  });
}

// =========================================================================
// VIEW 2: SERVER MANAGEMENT HUB
// =========================================================================

async function selectGuild(guildId) {
  state.currentGuildId = guildId;
  history.pushState(null, '', `/dashboard?guild=${guildId}`);

  document.getElementById('view-guild-selector').style.display = 'none';
  document.getElementById('view-guild-hub').style.display = 'block';

  showToast('Cargando configuración del servidor...', 'success');

  try {
    const data = await API.getGuild(guildId);
    state.currentGuildData = data;
    renderServerHub(data);
  } catch (err) {
    showToast(err.message || 'Error al obtener datos del servidor', 'error');
    showGuildsSelector();
  }
}

function renderServerHub(data) {
  const { guild, channels, roles, settings, automod, punishments, whitelist, filters, stats } = data;

  // 1. Breadcrumbs & Header
  document.getElementById('breadcrumb-container').innerHTML = `
    <span>/</span>
    <span style="color: var(--text-primary); font-weight: 600;">${guild.name}</span>
  `;

  document.getElementById('hub-server-name').textContent = guild.name;
  document.getElementById('hub-member-count').textContent = `${(guild.memberCount || 0).toLocaleString()} Miembros`;
  document.getElementById('hub-cases-count').textContent = `${stats?.totalCases || 0} Casos`;
  document.getElementById('hub-strikes-count').textContent = `${stats?.activeStrikesCount || 0} Strikes Activos`;

  const hubAvatar = document.getElementById('hub-server-avatar');
  if (guild.icon) {
    hubAvatar.innerHTML = `<img src="${guild.icon}" style="width: 100%; height: 100%; border-radius: var(--radius-lg); object-fit: cover;">`;
  } else {
    hubAvatar.textContent = guild.name.charAt(0).toUpperCase();
  }

  // 2. Tab Overview
  document.getElementById('overview-cases').textContent = stats?.totalCases || 0;
  document.getElementById('overview-strikes').textContent = stats?.activeStrikesCount || 0;
  document.getElementById('overview-prefix').textContent = settings?.prefix || '>>';
  const raidSwitch = document.getElementById('overview-raidmode-switch');
  raidSwitch.checked = Boolean(settings?.raid_mode);
  raidSwitch.onchange = async () => {
    try {
      await API.updateSettings(guild.id, { raid_mode: raidSwitch.checked ? 1 : 0 });
      showToast(`Modo Raid ${raidSwitch.checked ? 'activado' : 'desactivado'} correctamente`);
    } catch {
      showToast('Error al modificar modo Raid', 'error');
      raidSwitch.checked = !raidSwitch.checked;
    }
  };

  // 3. Tab General & Roles
  document.getElementById('setting-prefix').value = settings?.prefix || '>>';
  document.getElementById('setting-timezone').value = settings?.timezone || 'UTC';

  // Populate Mod & Mute roles selects
  const modRoleSelect = document.getElementById('setting-mod-role');
  const muteRoleSelect = document.getElementById('setting-mute-role');

  modRoleSelect.innerHTML = '<option value="">-- Ninguno asignado --</option>' +
    roles.map(r => `<option value="${r.id}" ${settings?.mod_role_id === r.id ? 'selected' : ''}>@${r.name}</option>`).join('');

  muteRoleSelect.innerHTML = '<option value="">-- Usar Timeout Nativo de Discord --</option>' +
    roles.map(r => `<option value="${r.id}" ${settings?.mute_role_id === r.id ? 'selected' : ''}>@${r.name}</option>`).join('');

  document.getElementById('form-general-settings').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const prefix = document.getElementById('setting-prefix').value.trim();
      const timezone = document.getElementById('setting-timezone').value;
      const mod_role_id = modRoleSelect.value || null;
      const mute_role_id = muteRoleSelect.value || null;

      await API.updateSettings(guild.id, { prefix, timezone, mod_role_id, mute_role_id });
      document.getElementById('overview-prefix').textContent = prefix;
      showToast('Configuración general guardada');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 4. Tab Logs
  const modlogSelect = document.getElementById('log-channel-modlog');
  const messagelogSelect = document.getElementById('log-channel-messagelog');
  const serverlogSelect = document.getElementById('log-channel-serverlog');
  const voicelogSelect = document.getElementById('log-channel-voicelog');

  const textOptions = '<option value="">-- Deshabilitado --</option>' +
    channels.text.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const voiceOptions = '<option value="">-- Deshabilitado --</option>' +
    channels.voice.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  modlogSelect.innerHTML = textOptions;
  messagelogSelect.innerHTML = textOptions;
  serverlogSelect.innerHTML = textOptions;
  voicelogSelect.innerHTML = voiceOptions;

  if (settings?.modlog_channel_id) modlogSelect.value = settings.modlog_channel_id;
  if (settings?.messagelog_channel_id) messagelogSelect.value = settings.messagelog_channel_id;
  if (settings?.serverlog_channel_id) serverlogSelect.value = settings.serverlog_channel_id;
  if (settings?.voicelog_channel_id) voicelogSelect.value = settings.voicelog_channel_id;

  document.getElementById('form-log-channels').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await API.updateSettings(guild.id, {
        modlog_channel_id: modlogSelect.value || null,
        messagelog_channel_id: messagelogSelect.value || null,
        serverlog_channel_id: serverlogSelect.value || null,
        voicelog_channel_id: voicelogSelect.value || null
      });
      showToast('Canales de logs actualizados exitosamente');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // 5. Tab AutoMod
  document.getElementById('automod-anti-invite').value = automod?.anti_invite ?? 1;
  document.getElementById('automod-anti-duplicate').checked = Boolean(automod?.anti_duplicate);
  document.getElementById('automod-anti-copypasta').checked = Boolean(automod?.anti_copypasta);
  document.getElementById('automod-anti-everyone').checked = Boolean(automod?.anti_everyone);
  document.getElementById('automod-anti-referral').checked = Boolean(automod?.anti_referral);
  document.getElementById('automod-auto-dehoist').checked = Boolean(automod?.auto_dehoist);
  document.getElementById('automod-max-mentions').value = automod?.max_mentions || 0;
  document.getElementById('automod-max-lines').value = automod?.max_lines || 0;
  document.getElementById('automod-raid-threshold').value = automod?.auto_raid_mode_number || 0;
  document.getElementById('automod-raid-time').value = automod?.auto_raid_mode_time || 10;

  document.getElementById('form-automod-settings').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await API.updateAutomod(guild.id, {
        anti_invite: Number(document.getElementById('automod-anti-invite').value),
        anti_duplicate: document.getElementById('automod-anti-duplicate').checked ? 1 : 0,
        anti_copypasta: document.getElementById('automod-anti-copypasta').checked ? 1 : 0,
        anti_everyone: document.getElementById('automod-anti-everyone').checked ? 1 : 0,
        anti_referral: document.getElementById('automod-anti-referral').checked ? 1 : 0,
        auto_dehoist: document.getElementById('automod-auto-dehoist').checked ? '!' : '',
        max_mentions: Number(document.getElementById('automod-max-mentions').value),
        max_lines: Number(document.getElementById('automod-max-lines').value),
        auto_raid_mode_number: Number(document.getElementById('automod-raid-threshold').value),
        auto_raid_mode_time: Number(document.getElementById('automod-raid-time').value)
      });
      showToast('Reglas de AutoMod guardadas');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Render Whitelist & Filters
  renderWhitelistTags(guild.id, whitelist || []);
  renderFiltersTable(guild.id, filters || []);

  // 6. Tab Punishments Ladder
  renderPunishmentsTable(guild.id, punishments || []);

  // 7. Tab Cases
  loadCases(guild.id);

  // 8. Tab Strikes
  loadStrikes(guild.id);

  // Setup Modals for Current Guild
  setupGuildModals(guild.id);
}

// Whitelist Renderer
function renderWhitelistTags(guildId, list) {
  const container = document.getElementById('whitelist-tags-container');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">No hay invitaciones permitidas en la lista blanca.</span>';
    return;
  }

  container.innerHTML = list.map(item => `
    <span class="tag-pill">
      <span>${item}</span>
      <span class="tag-remove" data-target="${item}">&times;</span>
    </span>
  `).join('');

  container.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = btn.getAttribute('data-target');
      try {
        const res = await API.removeWhitelist(guildId, target);
        renderWhitelistTags(guildId, res.whitelist);
        showToast(`"${target}" eliminado de la lista blanca`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// Filters Renderer
function renderFiltersTable(guildId, filters) {
  const tbody = document.getElementById('filters-table-body');
  if (!tbody) return;

  if (filters.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay filtros de palabras configurados.</td></tr>';
    return;
  }

  tbody.innerHTML = filters.map(f => `
    <tr>
      <td class="mono">#${f.id}</td>
      <td class="mono" style="color: var(--accent-cyan); font-weight: 600;">${f.pattern}</td>
      <td>${f.is_regex ? '<span class="tag-pill" style="background: rgba(6, 182, 212, 0.15); color: #67e8f9;">Regex</span>' : 'Palabra'}</td>
      <td><span class="tag-pill" style="background: rgba(245, 158, 11, 0.15); color: #fcd34d;">+${f.strikes}</span></td>
      <td>
        <button class="btn btn-danger btn-sm btn-delete-filter" data-id="${f.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.btn-delete-filter').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      try {
        const res = await API.removeFilter(guildId, id);
        renderFiltersTable(guildId, res.filters);
        showToast('Filtro eliminado');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// Punishments Ladder Renderer
function renderPunishmentsTable(guildId, punishments) {
  const tbody = document.getElementById('punishments-table-body');
  if (!tbody) return;

  const sorted = [...punishments].sort((a, b) => a.strike_count - b.strike_count);

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No hay reglas de escalado configuradas.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(p => {
    const actionClass = `badge-${p.action.toLowerCase().replace('temp', '')}`;
    const durationText = p.duration_seconds > 0 ? `${Math.round(p.duration_seconds / 60)} minutos` : 'Indefinido';

    return `
      <tr>
        <td><strong>${p.strike_count} Strikes</strong></td>
        <td><span class="badge-action ${actionClass}">${p.action}</span></td>
        <td>${durationText}</td>
        <td>
          <button class="btn btn-danger btn-sm btn-delete-punishment" data-count="${p.strike_count}">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.btn-delete-punishment').forEach(btn => {
    btn.addEventListener('click', async () => {
      const count = btn.getAttribute('data-count');
      try {
        const res = await API.removePunishment(guildId, count);
        renderPunishmentsTable(guildId, res.punishments);
        showToast(`Escalón de ${count} strikes eliminado`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

// Cases Manager
async function loadCases(guildId) {
  const tbody = document.getElementById('cases-table-body');
  if (!tbody) return;

  const action = document.getElementById('cases-filter-action')?.value || 'ALL';
  const search = document.getElementById('cases-search-input')?.value.trim() || '';

  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Cargando casos de moderación...</td></tr>';

  try {
    const data = await API.getCases(guildId, state.casesPage, 20, action, search);
    state.casesTotalPages = data.totalPages || 1;

    document.getElementById('cases-page-info').textContent = `Página ${data.page} de ${data.totalPages} (${data.total} casos)`;
    document.getElementById('cases-btn-prev').disabled = data.page <= 1;
    document.getElementById('cases-btn-next').disabled = data.page >= data.totalPages;

    if (!data.cases || data.cases.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 20px;">No se encontraron casos de moderación.</td></tr>';
      return;
    }

    tbody.innerHTML = data.cases.map(c => {
      const actionClass = `badge-${c.action.toLowerCase().replace('temp', '')}`;
      const dateStr = new Date(c.timestamp).toLocaleString();

      return `
        <tr>
          <td class="mono" style="font-weight: bold; color: var(--accent-purple);">#${c.case_number}</td>
          <td><strong>${c.target_tag}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(${c.target_id})</span></td>
          <td>${c.moderator_tag}</td>
          <td><span class="badge-action ${actionClass}">${c.action}</span></td>
          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${c.reason}">${c.reason}</td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-edit-reason" data-case="${c.case_number}" data-reason="${c.reason.replace(/"/g, '&quot;')}" title="Editar motivo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');


    tbody.querySelectorAll('.btn-edit-reason').forEach(btn => {
      btn.addEventListener('click', () => {
        const caseNum = btn.getAttribute('data-case');
        const reason = btn.getAttribute('data-reason');

        document.getElementById('modal-edit-case-number').value = caseNum;
        document.getElementById('modal-case-num').textContent = `#${caseNum}`;
        document.getElementById('modal-input-reason').value = reason;
        openModal('modal-edit-reason');
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Strikes Manager
async function loadStrikes(guildId) {
  const tbody = document.getElementById('strikes-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Cargando lista de strikes...</td></tr>';

  try {
    const data = await API.getStrikes(guildId);
    const strikes = data.strikes || [];

    if (strikes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No hay miembros con infracciones activas.</td></tr>';
      return;
    }

    tbody.innerHTML = strikes.map(s => {
      const dateStr = s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '--';
      return `
        <tr>
          <td class="mono">${s.userId}</td>
          <td>
            <span class="tag-pill" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-weight: bold; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              <span>${s.strikes} Strikes</span>
            </span>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-secondary);">${dateStr}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-pardon-strike" data-user="${s.userId}">Perdonar 1 Strike</button>
          </td>
        </tr>
      `;
    }).join('');


    tbody.querySelectorAll('.btn-pardon-strike').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.getAttribute('data-user');
        try {
          await API.addStrikes(guildId, userId, -1);
          showToast('Strike perdonado correctamente');
          loadStrikes(guildId);
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Setup Modals Submission
function setupGuildModals(guildId) {
  // Add Whitelist Modal trigger
  document.getElementById('btn-add-whitelist-modal')?.addEventListener('click', () => {
    document.getElementById('modal-whitelist-target').value = '';
    openModal('modal-add-whitelist');
  });

  document.getElementById('form-add-whitelist').onsubmit = async (e) => {
    e.preventDefault();
    const target = document.getElementById('modal-whitelist-target').value.trim();
    if (!target) return;
    try {
      const res = await API.addWhitelist(guildId, target);
      renderWhitelistTags(guildId, res.whitelist);
      closeModal('modal-add-whitelist');
      showToast(`"${target}" añadido a la lista blanca`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Filter Modal trigger
  document.getElementById('btn-add-filter-modal')?.addEventListener('click', () => {
    document.getElementById('modal-filter-pattern').value = '';
    document.getElementById('modal-filter-is-regex').checked = false;
    openModal('modal-add-filter');
  });

  document.getElementById('form-add-filter').onsubmit = async (e) => {
    e.preventDefault();
    const pattern = document.getElementById('modal-filter-pattern').value.trim();
    const strikes = Number(document.getElementById('modal-filter-strikes').value);
    const isRegex = document.getElementById('modal-filter-is-regex').checked;
    if (!pattern) return;

    try {
      const res = await API.addFilter(guildId, pattern, isRegex, strikes);
      renderFiltersTable(guildId, res.filters);
      closeModal('modal-add-filter');
      showToast('Filtro añadido exitosamente');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Punishment Modal trigger
  document.getElementById('btn-add-punishment-modal')?.addEventListener('click', () => {
    openModal('modal-add-punishment');
  });

  document.getElementById('form-add-punishment').onsubmit = async (e) => {
    e.preventDefault();
    const strikeCount = Number(document.getElementById('modal-punishment-strikes').value);
    const action = document.getElementById('modal-punishment-action').value;
    const durationSeconds = Number(document.getElementById('modal-punishment-duration').value || 0);

    try {
      const res = await API.addPunishment(guildId, strikeCount, action, durationSeconds);
      renderPunishmentsTable(guildId, res.punishments);
      closeModal('modal-add-punishment');
      showToast(`Regla para ${strikeCount} strikes añadida`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Edit Case Reason Form
  document.getElementById('form-edit-reason').onsubmit = async (e) => {
    e.preventDefault();
    const caseNumber = document.getElementById('modal-edit-case-number').value;
    const reason = document.getElementById('modal-input-reason').value.trim();
    if (!reason) return;

    try {
      await API.updateCaseReason(guildId, caseNumber, reason);
      closeModal('modal-edit-reason');
      showToast(`Motivo del caso #${caseNumber} actualizado`);
      loadCases(guildId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Cases Pagination & Filtering
  document.getElementById('cases-filter-action').onchange = () => {
    state.casesPage = 1;
    loadCases(guildId);
  };

  let searchDebounce;
  document.getElementById('cases-search-input').oninput = () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      state.casesPage = 1;
      loadCases(guildId);
    }, 400);
  };

  document.getElementById('cases-btn-prev').onclick = () => {
    if (state.casesPage > 1) {
      state.casesPage--;
      loadCases(guildId);
    }
  };

  document.getElementById('cases-btn-next').onclick = () => {
    if (state.casesPage < state.casesTotalPages) {
      state.casesPage++;
      loadCases(guildId);
    }
  };

  // Add Strike Modal
  document.getElementById('btn-add-strike-modal')?.addEventListener('click', () => {
    document.getElementById('modal-strike-userid').value = '';
    document.getElementById('modal-strike-count').value = '1';
    openModal('modal-add-strike');
  });

  document.getElementById('form-add-strike').onsubmit = async (e) => {
    e.preventDefault();
    const userId = document.getElementById('modal-strike-userid').value.trim();
    const count = Number(document.getElementById('modal-strike-count').value);
    if (!userId) return;

    try {
      await API.addStrikes(guildId, userId, count);
      closeModal('modal-add-strike');
      showToast(`Strikes aplicados correctamente a ${userId}`);
      loadStrikes(guildId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
}

// Start
initApp();
