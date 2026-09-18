/**
 * Cosmic Dashboard API Client
 */

export const API = {
  // Auth
  async getMe() {
    const res = await fetch('/auth/me');
    return res.json();
  },

  // Global Stats
  async getStats() {
    const res = await fetch('/api/stats');
    return res.json();
  },

  // Guilds
  async getGuilds() {
    const res = await fetch('/api/guilds');
    if (!res.ok) throw new Error('Error al obtener lista de servidores');
    return res.json();
  },

  async getGuild(guildId) {
    const res = await fetch(`/api/guilds/${guildId}`);
    if (!res.ok) throw new Error('Error al obtener detalles del servidor');
    return res.json();
  },

  // Settings
  async updateSettings(guildId, data) {
    const res = await fetch(`/api/guilds/${guildId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar configuración');
    return res.json();
  },

  // AutoMod
  async updateAutomod(guildId, data) {
    const res = await fetch(`/api/guilds/${guildId}/automod`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error al actualizar reglas de AutoMod');
    return res.json();
  },

  // Whitelist
  async addWhitelist(guildId, target) {
    const res = await fetch(`/api/guilds/${guildId}/whitelist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target })
    });
    if (!res.ok) throw new Error('Error al añadir a lista blanca');
    return res.json();
  },

  async removeWhitelist(guildId, target) {
    const res = await fetch(`/api/guilds/${guildId}/whitelist/${encodeURIComponent(target)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar de lista blanca');
    return res.json();
  },

  // Filters
  async addFilter(guildId, pattern, isRegex, strikes) {
    const res = await fetch(`/api/guilds/${guildId}/filters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pattern, isRegex, strikes })
    });
    if (!res.ok) throw new Error('Error al añadir filtro');
    return res.json();
  },

  async removeFilter(guildId, id) {
    const res = await fetch(`/api/guilds/${guildId}/filters/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar filtro');
    return res.json();
  },

  // Punishments
  async addPunishment(guildId, strikeCount, action, durationSeconds) {
    const res = await fetch(`/api/guilds/${guildId}/punishments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strikeCount, action, durationSeconds })
    });
    if (!res.ok) throw new Error('Error al añadir sanción');
    return res.json();
  },

  async removePunishment(guildId, strikeCount) {
    const res = await fetch(`/api/guilds/${guildId}/punishments/${strikeCount}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar escalado de sanción');
    return res.json();
  },

  // Cases
  async getCases(guildId, page = 1, limit = 25, action = 'ALL', search = '') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (action && action !== 'ALL') params.set('action', action);
    if (search) params.set('search', search);

    const res = await fetch(`/api/guilds/${guildId}/cases?${params.toString()}`);
    if (!res.ok) throw new Error('Error al obtener historial de casos');
    return res.json();
  },

  async updateCaseReason(guildId, caseNumber, reason) {
    const res = await fetch(`/api/guilds/${guildId}/cases/${caseNumber}/reason`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Error al actualizar motivo del caso');
    return res.json();
  },

  // Strikes
  async getStrikes(guildId) {
    const res = await fetch(`/api/guilds/${guildId}/strikes`);
    if (!res.ok) throw new Error('Error al obtener strikes');
    return res.json();
  },

  async addStrikes(guildId, userId, count) {
    const res = await fetch(`/api/guilds/${guildId}/strikes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, count })
    });
    if (!res.ok) throw new Error('Error al modificar strikes');
    return res.json();
  }
};
