import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

// Render a dynamic result set (works for any SQL query, not just fixed columns)
const ResultTable = ({ rows, maxHeight = '420px' }) => {
  if (!rows || rows.length === 0) {
    return <div style={{ padding: '18px', color: '#6b7280', textAlign: 'center' }}>No rows returned.</div>;
  }
  const columns = Object.keys(rows[0]);
  const cell = (value) => {
    if (value === null || value === undefined) return <span style={{ color: '#9ca3af' }}>NULL</span>;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  return (
    <div className="table-container" style={{ maxHeight, overflowY: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                  {cell(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SqlOperationsPage = () => {
  const [activeSubTab, setActiveSubTab] = useState('tables'); // 'tables' | 'schema' | 'runner' | 'joins'
  const [status, setStatus] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Data browser state
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState('');
  const [dir, setDir] = useState('ASC');

  // Schema state
  const [schema, setSchema] = useState(null);

  // Runner state
  const [sql, setSql] = useState('SELECT * FROM donors LIMIT 10;');
  const [mode, setMode] = useState('query'); // 'query' | 'execute'
  const [runResult, setRunResult] = useState(null);

  // Joins state
  const [joins, setJoins] = useState([]);
  const [joinResult, setJoinResult] = useState(null);
  const [activeJoin, setActiveJoin] = useState(null);

  const PAGE_SIZE = 15;

  const loadStatusAndTables = async () => {
    try {
      setErrorMsg(null);
      const s = await api.getSqlStatus();
      setStatus(s);
      const t = await api.getSqlTables();
      setTables(t.tables);
      if (t.tables.length) {
        setSelectedTable((prev) => (prev && t.tables.find((x) => x.name === prev) ? prev : t.tables[0].name));
      }
      const j = await api.getSqlJoins();
      setJoins(j.joins);
    } catch (err) {
      setErrorMsg('Failed to load SQLite database info: ' + err.message);
    }
  };

  useEffect(() => {
    loadStatusAndTables();
  }, []);

  // Load rows for the selected table
  useEffect(() => {
    if (activeSubTab !== 'tables' || !selectedTable) return;
    const loadRows = async () => {
      try {
        setErrorMsg(null);
        const params = { page, limit: PAGE_SIZE };
        if (orderBy) {
          params.orderBy = orderBy;
          params.dir = dir;
        }
        const res = await api.getSqlRows(selectedTable, params);
        setRows(res.rows);
        setColumns(res.columns);
        setTotal(res.total);
      } catch (err) {
        setErrorMsg('Failed to fetch rows: ' + err.message);
      }
    };
    loadRows();
  }, [activeSubTab, selectedTable, page, orderBy, dir]);

  // Load schema when a table is selected
  useEffect(() => {
    if (activeSubTab !== 'schema' || !selectedTable) return;
    const loadSchema = async () => {
      try {
        setErrorMsg(null);
        const res = await api.getSqlSchema(selectedTable);
        setSchema(res);
      } catch (err) {
        setErrorMsg('Failed to load schema: ' + err.message);
      }
    };
    loadSchema();
  }, [activeSubTab, selectedTable]);

  const selectTable = (name) => {
    setSelectedTable(name);
    setPage(1);
    setOrderBy('');
    setDir('ASC');
  };

  const runSql = async () => {
    try {
      setErrorMsg(null);
      setSuccessMsg(null);
      setRunResult(null);
      if (mode === 'query') {
        const res = await api.runSqlQuery(sql);
        setRunResult({ type: 'query', ...res });
      } else {
        const res = await api.runSqlStatement(sql);
        setRunResult({ type: 'execute', ...res });
        loadStatusAndTables();
      }
    } catch (err) {
      setErrorMsg('SQL error: ' + err.message);
    }
  };

  const runJoin = async (id) => {
    try {
      setErrorMsg(null);
      setActiveJoin(id);
      const res = await api.runSqlJoin(id);
      setJoinResult(res);
    } catch (err) {
      setErrorMsg('Join query error: ' + err.message);
    }
  };

  return (
    <div>
      {errorMsg && <div className="alert alert-error">❌ {errorMsg}</div>}
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}

      {/* Connection banner */}
      {status && (
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fdfbf7' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`status-dot ${status.status === 'CONNECTED' ? 'online' : 'offline'}`} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                {status.status === 'CONNECTED' ? 'Relational Database Connected' : 'SQLite Not Connected'}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>{status.database} — {status.message}</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#4b5563' }}>
            {tables.length} tables
          </div>
        </div>
      )}

      {/* Subtabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2d9c8', paddingBottom: '10px', flexWrap: 'wrap' }}>
        {[
          { id: 'tables', label: '🗃️ Tables & Data Browser' },
          { id: 'schema', label: '🧱 Schema Inspector' },
          { id: 'runner', label: '💻 SQL Runner' },
          { id: 'joins', label: '🔗 Joins & Aggregates' },
        ].map((t) => (
          <button
            key={t.id}
            className={`btn ${activeSubTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setActiveSubTab(t.id);
              setErrorMsg(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: Tables & Data Browser */}
      {activeSubTab === 'tables' && (
        <div>
          <div className="card">
            <div className="card-title">
              <span>Normalized Relational Schema — {tables.length} tables</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tables.map((t) => (
                <button
                  key={t.name}
                  className={`btn ${selectedTable === t.name ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => selectTable(t.name)}
                  title={`${t.rowCount} rows · ${t.columnCount} columns · ${t.foreignKeyCount} foreign keys`}
                >
                  {t.name} <span style={{ opacity: 0.75 }}>({t.rowCount})</span>
                </button>
              ))}
            </div>
          </div>

          {selectedTable && (
            <div className="card">
              <div className="card-title">
                <span>
                  Table: <code>{selectedTable}</code> — page {page} of {Math.ceil(total / PAGE_SIZE) || 1} (total {total} rows)
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <select
                    className="form-control"
                    style={{ width: 'auto' }}
                    value={orderBy}
                    onChange={(e) => {
                      setOrderBy(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Order by…</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDir(dir === 'ASC' ? 'DESC' : 'ASC')}
                  >
                    {dir}
                  </button>
                  <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    ◀ Prev
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={page * PAGE_SIZE >= total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
              <ResultTable rows={rows} />
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Schema Inspector */}
      {activeSubTab === 'schema' && (
        <div>
          <div className="card">
            <div className="card-title">
              <span>Schema Inspector</span>
              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={selectedTable}
                onChange={(e) => selectTable(e.target.value)}
              >
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {schema && (
              <>
                <h4 style={{ margin: '4px 0 8px', color: '#14532d' }}>Columns of <code>{schema.table}</code></h4>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Column</th>
                        <th>Type</th>
                        <th>Primary Key</th>
                        <th>NOT NULL</th>
                        <th>Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.columns.map((c) => (
                        <tr key={c.name}>
                          <td><strong><code>{c.name}</code></strong></td>
                          <td><code>{c.type || '—'}</code></td>
                          <td>{c.primaryKey ? <span className="badge badge-success">PK</span> : '—'}</td>
                          <td>{c.notNull ? <span className="badge badge-warning">YES</span> : '—'}</td>
                          <td><code>{c.defaultValue ?? '—'}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ margin: '20px 0 8px', color: '#14532d' }}>Foreign Keys</h4>
                {schema.foreignKeys.length ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>References</th>
                          <th>ON DELETE</th>
                          <th>ON UPDATE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.foreignKeys.map((fk, i) => (
                          <tr key={i}>
                            <td><code>{fk.column}</code></td>
                            <td><code>{fk.referencesTable}({fk.referencesColumn})</code></td>
                            <td><span className="badge badge-secondary">{fk.onDelete}</span></td>
                            <td><span className="badge badge-secondary">{fk.onUpdate}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>No foreign keys on this table.</p>
                )}

                <h4 style={{ margin: '20px 0 8px', color: '#14532d' }}>Indexes</h4>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Index</th>
                        <th>Columns</th>
                        <th>Unique</th>
                        <th>Origin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schema.indexes.map((idx) => (
                        <tr key={idx.name}>
                          <td><strong><code>{idx.name}</code></strong></td>
                          <td><code>{idx.columns.join(', ')}</code></td>
                          <td>{idx.unique ? <span className="badge badge-success">Unique</span> : <span className="badge badge-secondary">Secondary</span>}</td>
                          <td>{idx.origin}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h4 style={{ margin: '20px 0 8px', color: '#14532d' }}>CREATE Statement</h4>
                <pre style={{ background: '#f1ede4', padding: '12px', borderRadius: '6px', fontSize: '12px', overflowX: 'auto' }}>
                  {schema.createStatement}
                </pre>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: SQL Runner */}
      {activeSubTab === 'runner' && (
        <div>
          <div className="card">
            <div className="card-title">
              <span>Execute SQL against the SQLite database</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`btn btn-sm ${mode === 'query' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMode('query')}
                >
                  Read (SELECT)
                </button>
                <button
                  className={`btn btn-sm ${mode === 'execute' ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => setMode('execute')}
                >
                  Write (INSERT/UPDATE/DELETE)
                </button>
              </div>
            </div>

            {mode === 'execute' && (
              <div className="alert alert-warning" style={{ marginBottom: '12px' }}>
                ⚠️ Write mode modifies the SQLite database file directly. Use carefully.
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {[
                { label: 'All donors', sql: 'SELECT * FROM donors;' },
                { label: 'Available surplus', sql: "SELECT surplus_id, quantity, expiry_time, status FROM surplus_food WHERE status = 'Available';" },
                { label: 'Pending requests', sql: "SELECT request_id, quantity_required, priority FROM food_requests WHERE status = 'Pending';" },
                { label: 'Table count', sql: "SELECT COUNT(*) AS tables FROM sqlite_master WHERE type = 'table';" },
              ].map((ex) => (
                <button key={ex.label} className="btn btn-secondary btn-sm" onClick={() => setSql(ex.sql)}>
                  {ex.label}
                </button>
              ))}
            </div>

            <textarea
              rows="6"
              className="form-control"
              style={{ fontFamily: 'monospace', fontSize: '13px' }}
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT * FROM donors LIMIT 10;"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => { setSql(''); setRunResult(null); }}>
                Clear
              </button>
              <button className="btn btn-primary" onClick={runSql}>
                ▶ Run Statement
              </button>
            </div>
          </div>

          {runResult && runResult.type === 'query' && (
            <div className="card">
              <div className="card-title">
                <span>Query Result — {runResult.rowCount} rows in {runResult.executionTimeMs} ms</span>
              </div>
              <ResultTable rows={runResult.rows} />
            </div>
          )}

          {runResult && runResult.type === 'execute' && (
            <div className="card">
              <div className="card-title">Statement Executed</div>
              <p style={{ fontSize: '13px' }}>{runResult.message}</p>
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                Rows affected: <strong>{runResult.changes}</strong> · Last insert rowid: <strong>{runResult.lastInsertRowid}</strong> · {runResult.executionTimeMs} ms
              </p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: Joins & Aggregates */}
      {activeSubTab === 'joins' && (
        <div>
          <div className="card">
            <div className="card-title">Predefined JOIN & Aggregate Demonstrations</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
              {joins.map((j) => (
                <div
                  key={j.id}
                  onClick={() => runJoin(j.id)}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: activeJoin === j.id ? '2px solid #15803d' : '1px solid #e2d9c8',
                    backgroundColor: activeJoin === j.id ? '#f0fdf4' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <strong style={{ fontSize: '14px', color: '#14532d' }}>{j.title}</strong>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{j.description}</p>
                </div>
              ))}
            </div>
          </div>

          {joinResult && (
            <div className="card">
              <div className="card-title">
                <span>{joinResult.title} — {joinResult.rowCount} rows in {joinResult.executionTimeMs} ms</span>
              </div>
              <p style={{ fontSize: '12px', color: '#4b5563', marginBottom: '8px' }}>{joinResult.description}</p>
              <pre style={{ background: '#f1ede4', padding: '10px', borderRadius: '6px', fontSize: '11px', overflowX: 'auto', marginBottom: '14px' }}>
                {joinResult.sql}
              </pre>
              <ResultTable rows={joinResult.rows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SqlOperationsPage;
