// Central API service communicating directly with Node/Express backend -> MongoDB Atlas
const API_BASE = 'http://localhost:5000/api';

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`);
  }
  return data;
};

export const api = {
  // System Health & Atlas Status
  getHealth: () => fetch(`${API_BASE}/health`).then(handleResponse),

  // Dashboard & Aggregations
  getDashboardStats: () => fetch(`${API_BASE}/analytics/dashboard`).then(handleResponse),
  getAggregations: (pipelineId) =>
    fetch(`${API_BASE}/analytics/aggregations${pipelineId ? `?pipelineId=${pipelineId}` : ''}`).then(handleResponse),

  // Queries & Matching
  executeAdvancedQuery: (params) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/queries/execute?${q}`).then(handleResponse);
  },
  matchFoodRequest: (requestId) =>
    fetch(`${API_BASE}/queries/match-request/${requestId}`).then(handleResponse),
  allocateFood: (payload) =>
    fetch(`${API_BASE}/queries/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handleResponse),

  // Generic REST CRUD
  list: (resource, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/${resource}${q ? `?${q}` : ''}`).then(handleResponse);
  },
  getOne: (resource, id) => fetch(`${API_BASE}/${resource}/${id}`).then(handleResponse),
  create: (resource, data) =>
    fetch(`${API_BASE}/${resource}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
  update: (resource, id, data) =>
    fetch(`${API_BASE}/${resource}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
  delete: (resource, id) =>
    fetch(`${API_BASE}/${resource}/${id}`, {
      method: 'DELETE',
    }).then(handleResponse),

  // Lab Database Operations
  getCollections: () => fetch(`${API_BASE}/database/collections`).then(handleResponse),
  getCollectionIndexes: (col) => fetch(`${API_BASE}/database/indexes/${col}`).then(handleResponse),
  getRawDocuments: (col, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/database/raw/${col}${q ? `?${q}` : ''}`).then(handleResponse);
  },
  insertRawDoc: (col, data) =>
    fetch(`${API_BASE}/database/raw/${col}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
  updateRawDoc: (col, id, data) =>
    fetch(`${API_BASE}/database/raw/${col}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse),
  deleteRawDoc: (col, id) =>
    fetch(`${API_BASE}/database/raw/${col}/${id}`, {
      method: 'DELETE',
    }).then(handleResponse),
  customQuery: (payload) =>
    fetch(`${API_BASE}/database/custom-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handleResponse),

  // Relational SQL Lab (SQLite)
  getSqlStatus: () => fetch(`${API_BASE}/sql/status`).then(handleResponse),
  getSqlTables: () => fetch(`${API_BASE}/sql/tables`).then(handleResponse),
  getSqlSchema: (table) => fetch(`${API_BASE}/sql/schema/${table}`).then(handleResponse),
  getSqlRows: (table, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/sql/rows/${table}${q ? `?${q}` : ''}`).then(handleResponse);
  },
  runSqlQuery: (sql) =>
    fetch(`${API_BASE}/sql/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    }).then(handleResponse),
  runSqlStatement: (sql) =>
    fetch(`${API_BASE}/sql/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    }).then(handleResponse),
  getSqlJoins: () => fetch(`${API_BASE}/sql/joins`).then(handleResponse),
  runSqlJoin: (id) => fetch(`${API_BASE}/sql/joins/${id}`).then(handleResponse),
};
