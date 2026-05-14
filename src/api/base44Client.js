// Local API client that exposes the same surface as the legacy Base44 SDK so the
// existing pages keep working (`base44.entities.X.list/filter/create/update/get/delete`,
// `base44.auth.me/logout/redirectToLogin`, `base44.integrations.Core.InvokeLLM/UploadFile`).
const API_BASE = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

const request = async (path, { method = 'GET', body, query, headers } = {}) => {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const init = {
    method,
    credentials: 'include',
    headers: { Accept: 'application/json', ...(headers || {}) },
  };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), init);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text();

  if (!res.ok) {
    throw new ApiError(data?.message || data?.error || res.statusText, res.status, data);
  }
  return data;
};

const buildListArgs = (orderOrFilter, orderOrLimit, maybeLimit) => {
  // Base44 signatures vary:
  //   list(order?, limit?) | list("-created_date", 50)
  //   filter(filterObj, order?, limit?)
  let filter, order, limit;
  if (typeof orderOrFilter === 'object' && orderOrFilter !== null) {
    filter = orderOrFilter;
    order = orderOrLimit;
    limit = maybeLimit;
  } else {
    order = orderOrFilter;
    limit = orderOrLimit;
  }
  const query = {};
  if (order) query.order = order;
  if (limit) query.limit = limit;
  if (filter) query.filter = JSON.stringify(filter);
  return query;
};

const makeEntity = (name) => ({
  list: (order, limit) => request(`/entities/${name}`, { query: buildListArgs(order, limit) }),
  filter: (filter, order, limit) => request(`/entities/${name}`, { query: buildListArgs(filter, order, limit) }),
  get: (id) => request(`/entities/${name}/${encodeURIComponent(id)}`),
  create: (data) => request(`/entities/${name}`, { method: 'POST', body: data }),
  update: (id, data) => request(`/entities/${name}/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
  delete: (id) => request(`/entities/${name}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
});

const ENTITY_NAMES = [
  'Patient',
  'HealthCenter',
  'MeraDevice',
  'DiagnosticSession',
  'VitalSigns',
  'EyePhoto',
  'ContagiousEyeResult',
  'NonContagiousEyeResult',
  'SystemicPrediction',
  'TraditionalTreatment',
  'VocalExchange',
  'MedicalReview',
];

const entities = Object.fromEntries(ENTITY_NAMES.map((n) => [n, makeEntity(n)]));

const multipartRequest = async (path, formData) => {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  const res = await fetch(url.toString(), { method: 'POST', credentials: 'include', body: formData });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => null) : await res.text();
  if (!res.ok) throw new ApiError(data?.message || data?.error || res.statusText, res.status, data);
  return data;
};

const auth = {
  me: () => request('/auth/me'),
  // identifier can be an email OR an ID Card attributed by an admin.
  login: (identifier, password) => request('/auth/login', { method: 'POST', body: { identifier, password } }),
  requestRegistration: (formData) => multipartRequest('/auth/request-registration', formData),
  logout: async (redirectUrl) => {
    try { await request('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    if (redirectUrl) window.location.href = '/login';
  },
  redirectToLogin: (returnUrl) => {
    const next = returnUrl ? `?next=${encodeURIComponent(returnUrl)}` : '';
    window.location.href = `/login${next}`;
  },
};

// Patient namespace — staff registers patients (returns plaintext PIN ONCE),
// patients log in with QR + PIN and access scoped data.
const patient = {
  register: (payload) => request('/auth/patient/register', { method: 'POST', body: payload }),
  regeneratePin: (id, body) => request(`/auth/patient/regenerate-pin/${encodeURIComponent(id)}`, { method: 'POST', body }),
  login: (card_id, pin) => request('/auth/patient/login', { method: 'POST', body: { card_id, pin } }),
  me: () => request('/auth/patient/me'),
  updateMe: (data) => request('/auth/patient/me', { method: 'PATCH', body: data }),
  sessions: () => request('/patient/sessions'),
  session: (id) => request(`/patient/sessions/${encodeURIComponent(id)}`),
  treatments: () => request('/patient/treatments'),
};

const Core = {
  InvokeLLM: async ({ prompt, system, max_tokens } = {}) => {
    const data = await request('/llm/invoke', { method: 'POST', body: { prompt, system, max_tokens } });
    return data.response;
  },
  // Prédictions diagnostic IA. Si session_id est fourni → persiste en BD + notif.
  // Sinon (mode preview) → just LLM output ephemeral, basé sur le context fourni.
  PredictDiagnosis: ({ session_id, context } = {}) =>
    request('/llm/predict-diagnosis', { method: 'POST', body: { session_id, context } }),
  UploadFile: async ({ file }) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', credentials: 'include', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiError(err.message || res.statusText, res.status, err);
    }
    return res.json();
  },
};

// Devices (ESP32 robot management). `ping` is staff (anyone can probe),
// token reveal/regenerate is admin-only.
const devices = {
  ping: (id) => request(`/devices/${encodeURIComponent(id)}/ping`, { method: 'POST' }),
  getToken: (id) => request(`/devices/${encodeURIComponent(id)}/token`),
  regenerateToken: (id) => request(`/devices/${encodeURIComponent(id)}/regenerate-token`, { method: 'POST' }),
};

// Notifications for the current authenticated staff user.
const notifications = {
  list: ({ unread = false, limit = 30 } = {}) =>
    request('/me/notifications', { query: { unread: unread ? 1 : 0, limit } }),
  markRead: (id) => request(`/me/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/me/notifications/read-all', { method: 'POST' }),
};

// Admin-only operations (only callable by admin users).
const admin = {
  listRequests: (status = 'pending') => request('/admin/registration-requests', { query: { status } }),
  approveRequest: (id, body) => request(`/admin/registration-requests/${encodeURIComponent(id)}/approve`, { method: 'POST', body }),
  rejectRequest: (id, reason) => request(`/admin/registration-requests/${encodeURIComponent(id)}/reject`, { method: 'POST', body: { reason } }),
  listUsers: () => request('/admin/users'),
  createUser: (payload) => request('/admin/users', { method: 'POST', body: payload }),
  updateUser: (id, data) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: data }),
  resetPassword: (id, password) => request(`/admin/users/${encodeURIComponent(id)}/reset-password`, { method: 'POST', body: { password } }),
  regenerateIdCard: (id) => request(`/admin/users/${encodeURIComponent(id)}/regenerate-id-card`, { method: 'POST' }),
  deleteUser: (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  listAssignments: () => request('/admin/assignments'),
  createAssignment: (doctor_id, encadreur_id) => request('/admin/assignments', { method: 'POST', body: { doctor_id, encadreur_id } }),
  deleteAssignment: (id) => request(`/admin/assignments/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const base44 = { entities, auth, patient, admin, devices, notifications, integrations: { Core } };
export default base44;
