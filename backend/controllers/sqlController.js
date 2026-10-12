const { all, run, getSqliteStatus } = require('../config/sqlite');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`;

// Get the list of real user tables (excludes SQLite internal tables)
const listTableNames = async () => {
  const rows = await all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  return rows.map((r) => r.name);
};

// Reject a table name that does not exist to prevent identifier injection
const resolveTable = async (name) => {
  const tables = await listTableNames();
  const match = tables.find((t) => t.toLowerCase() === String(name || '').toLowerCase());
  if (!match) {
    const err = new Error(`Unknown table: ${name}`);
    err.status = 404;
    throw err;
  }
  return match;
};

const getColumns = async (table) => {
  const rows = await all(`PRAGMA table_info(${quoteIdent(table)})`);
  return rows.map((c) => ({
    name: c.name,
    type: c.type,
    notNull: !!c.notnull,
    defaultValue: c.dflt_value,
    primaryKey: !!c.pk,
  }));
};

// Guard against executing several statements in one call
const assertSingleStatement = (sql) => {
  const trimmed = String(sql || '').trim().replace(/;\s*$/, '');
  if (!trimmed) {
    const err = new Error('SQL statement is empty');
    err.status = 400;
    throw err;
  }
  if (trimmed.includes(';')) {
    const err = new Error('Only a single SQL statement may be executed at a time');
    err.status = 400;
    throw err;
  }
  return trimmed;
};

const READ_KEYWORDS = ['select', 'with', 'pragma', 'explain'];
const isReadStatement = (sql) => READ_KEYWORDS.includes(sql.trim().split(/\s+/)[0].toLowerCase());

// ---------------------------------------------------------------------------
// Predefined JOIN / aggregate demonstrations
// ---------------------------------------------------------------------------

const JOIN_QUERIES = [
  {
    id: 'availableSurplusWithDonor',
    title: '1. Available Surplus with Donor & Food (INNER JOIN)',
    description:
      'Three-table INNER JOIN linking surplus_food to its donor and food item, filtered to Available batches.',
    sql: `SELECT sf.surplus_id, d.name AS donor_name, fi.name AS food_item,
       sf.quantity, sf.packaging_type, sf.expiry_time, sf.status
FROM surplus_food sf
INNER JOIN donors d ON sf.donor_id = d.donor_id
INNER JOIN food_items fi ON sf.food_item_id = fi.food_id
WHERE sf.status = 'Available'
ORDER BY sf.expiry_time ASC`,
  },
  {
    id: 'donorsWithBatchCount',
    title: '2. Every Donor & Their Batch Count (LEFT JOIN)',
    description:
      'LEFT JOIN keeps donors who have contributed nothing yet, using COUNT() to show surplus batches per donor.',
    sql: `SELECT d.donor_id, d.name AS donor_name, d.type,
       COUNT(sf.surplus_id) AS surplus_batches,
       COALESCE(SUM(sf.quantity), 0) AS total_quantity
FROM donors d
LEFT JOIN surplus_food sf ON d.donor_id = sf.donor_id
GROUP BY d.donor_id, d.name, d.type
ORDER BY surplus_batches DESC, donor_name ASC`,
  },
  {
    id: 'donationTotalsByDonor',
    title: '3. Total Donated Quantity by Donor (GROUP BY)',
    description:
      'Aggregates the donations table per donor with SUM() and COUNT(), joined back to the donors table.',
    sql: `SELECT d.donor_id, d.name AS donor_name, d.type,
       COUNT(dn.donation_id) AS donation_count,
       SUM(dn.quantity_donated) AS total_donated
FROM donations dn
INNER JOIN donors d ON dn.donor_id = d.donor_id
GROUP BY d.donor_id, d.name, d.type
ORDER BY total_donated DESC`,
  },
  {
    id: 'deliveryDetails',
    title: '4. Delivery Details with Shelter, Volunteer & Vehicle (Multi-JOIN)',
    description:
      'Chains deliveries -> shelters -> pickups -> volunteers -> vehicles to reconstruct a full delivery run.',
    sql: `SELECT dl.delivery_id, dl.status, dl.quantity_delivered,
       sh.name AS shelter_name,
       v.name AS volunteer_name,
       ve.vehicle_number
FROM deliveries dl
INNER JOIN shelters sh ON dl.shelter_id = sh.shelter_id
LEFT JOIN pickups p ON dl.pickup_id = p.pickup_id
LEFT JOIN volunteers v ON p.volunteer_id = v.volunteer_id
LEFT JOIN vehicles ve ON p.vehicle_id = ve.vehicle_id
ORDER BY dl.delivery_id`,
  },
  {
    id: 'requestsWithShelter',
    title: '5. Food Requests with NGO, Shelter & Matched Surplus',
    description:
      'LEFT JOINs expose pending requests and any surplus batch already matched to them.',
    sql: `SELECT fr.request_id, fr.quantity_required, fr.fulfilled_quantity,
       fr.priority, fr.status,
       n.name AS ngo_name,
       sh.name AS shelter_name,
       sf.surplus_id AS matched_surplus
FROM food_requests fr
LEFT JOIN ngos n ON fr.ngo_id = n.ngo_id
LEFT JOIN shelters sh ON fr.shelter_id = sh.shelter_id
LEFT JOIN surplus_food sf ON fr.matched_surplus_id = sf.surplus_id
ORDER BY fr.priority, fr.required_before`,
  },
  {
    id: 'routeCities',
    title: '6. Routes with Source & Destination Cities (Self-JOIN on locations)',
    description:
      'Joins the locations table to itself twice to resolve both ends of every logistics route.',
    sql: `SELECT r.route_id, r.distance_km, r.estimated_duration, r.status,
       sl.city AS source_city,
       dl.city AS destination_city
FROM routes r
INNER JOIN locations sl ON r.source_location_id = sl.location_id
INNER JOIN locations dl ON r.destination_location_id = dl.location_id
ORDER BY r.distance_km`,
  },
  {
    id: 'avgFeedbackByShelter',
    title: '7. Average Feedback Rating per Shelter (JOIN + AVG)',
    description:
      'Joins feedbacks -> deliveries -> shelters and computes AVG/MIN/MAX rating to rank shelter satisfaction.',
    sql: `SELECT sh.shelter_id, sh.name AS shelter_name,
       COUNT(f.feedback_id) AS reviews,
       ROUND(AVG(f.rating), 2) AS avg_rating,
       MIN(f.rating) AS min_rating,
       MAX(f.rating) AS max_rating
FROM feedbacks f
INNER JOIN deliveries dl ON f.delivery_id = dl.delivery_id
INNER JOIN shelters sh ON dl.shelter_id = sh.shelter_id
GROUP BY sh.shelter_id, sh.name
ORDER BY avg_rating DESC`,
  },
  {
    id: 'surplusByStatus',
    title: '8. Surplus Quantity by Status (GROUP BY count & sum)',
    description:
      'Groups the surplus_food inventory by status with COUNT(), SUM() and AVG() to summarise the stock pipeline.',
    sql: `SELECT status,
       COUNT(*) AS batches,
       SUM(quantity) AS total_quantity,
       SUM(allocated_quantity) AS allocated,
       ROUND(AVG(quantity), 1) AS avg_batch_size
FROM surplus_food
GROUP BY status
ORDER BY total_quantity DESC`,
  },
];

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

// GET /api/sql/status
const getStatus = (req, res) => {
  const status = getSqliteStatus();
  res.json({
    success: true,
    status: status.isConnected ? 'CONNECTED' : 'DISCONNECTED',
    database: status.database,
    path: status.path,
    error: status.error,
    message: status.isConnected
      ? 'Connected to the relational SQLite database'
      : 'SQLite database is not connected. Ensure backend/data/food_management.sqlite exists.',
  });
};

// GET /api/sql/tables
const getTables = async (req, res) => {
  try {
    const names = await listTableNames();
    const tables = [];
    for (const name of names) {
      const { total } = (await all(`SELECT COUNT(*) AS total FROM ${quoteIdent(name)}`))[0];
      const cols = await all(`PRAGMA table_info(${quoteIdent(name)})`);
      const idx = await all(`PRAGMA index_list(${quoteIdent(name)})`);
      const fks = await all(`PRAGMA foreign_key_list(${quoteIdent(name)})`);
      tables.push({
        name,
        rowCount: total,
        columnCount: cols.length,
        indexCount: idx.length,
        foreignKeyCount: fks.length,
      });
    }

    const sqliteVersion = (await all('SELECT sqlite_version() AS v'))[0].v;
    res.json({ success: true, database: getSqliteStatus().database, sqliteVersion, tables });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/sql/schema/:table
const getTableSchema = async (req, res) => {
  try {
    const table = await resolveTable(req.params.table);
    const columns = await getColumns(table);
    const foreignKeys = (await all(`PRAGMA foreign_key_list(${quoteIdent(table)})`)).map((fk) => ({
      column: fk.from,
      referencesTable: fk.table,
      referencesColumn: fk.to,
      onDelete: fk.on_delete,
      onUpdate: fk.on_update,
    }));
    const indexes = [];
    for (const idx of await all(`PRAGMA index_list(${quoteIdent(table)})`)) {
      const info = await all(`PRAGMA index_info(${quoteIdent(idx.name)})`);
      const def = await all("SELECT sql FROM sqlite_master WHERE type='index' AND name=?", [idx.name]);
      indexes.push({
        name: idx.name,
        unique: !!idx.unique,
        origin: idx.origin,
        columns: info.map((i) => i.name),
        definition: def.length ? def[0].sql : null,
      });
    }
    const { sql } = (await all("SELECT sql FROM sqlite_master WHERE type='table' AND name=?", [table]))[0] || {};

    res.json({ success: true, table, createStatement: sql, columns, foreignKeys, indexes });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// GET /api/sql/rows/:table?page&limit&orderBy&dir
const getTableRows = async (req, res) => {
  const { page = 1, limit = 20, orderBy, dir = 'ASC' } = req.query;
  try {
    const table = await resolveTable(req.params.table);
    const columns = await getColumns(table);

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let orderClause = '';
    if (orderBy) {
      const col = columns.find((c) => c.name.toLowerCase() === String(orderBy).toLowerCase());
      if (!col) return res.status(400).json({ success: false, error: `Unknown column: ${orderBy}` });
      const direction = String(dir).toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      orderClause = ` ORDER BY ${quoteIdent(col.name)} ${direction}`;
    }

    const rows = await all(
      `SELECT * FROM ${quoteIdent(table)}${orderClause} LIMIT ? OFFSET ?`,
      [limitNum, offset]
    );
    const { total } = (await all(`SELECT COUNT(*) AS total FROM ${quoteIdent(table)}`))[0];

    res.json({
      success: true,
      table,
      columns: columns.map((c) => c.name),
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      count: rows.length,
      rows,
    });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
};

// POST /api/sql/query  { sql, params? } - read-only SELECT/WITH/PRAGMA/EXPLAIN
const runQuery = async (req, res) => {
  try {
    const sql = assertSingleStatement(req.body.sql);
    if (!isReadStatement(sql)) {
      return res.status(400).json({
        success: false,
        error: 'This endpoint only runs read queries (SELECT / WITH / PRAGMA / EXPLAIN). Use the execute endpoint for writes.',
      });
    }
    const params = Array.isArray(req.body.params) ? req.body.params : [];

    const start = Date.now();
    const rows = await all(sql, params);
    const executionTimeMs = Date.now() - start;

    res.json({
      success: true,
      statement: sql,
      rowCount: rows.length,
      columns: rows.length ? Object.keys(rows[0]) : [],
      executionTimeMs,
      rows,
    });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

// POST /api/sql/execute { sql, params? } - write / DDL statements
const runStatement = async (req, res) => {
  try {
    const sql = assertSingleStatement(req.body.sql);
    const params = Array.isArray(req.body.params) ? req.body.params : [];

    const start = Date.now();
    const result = await run(sql, params);
    const executionTimeMs = Date.now() - start;

    res.json({
      success: true,
      statement: sql,
      changes: result.changes,
      lastInsertRowid: result.lastID,
      executionTimeMs,
      message: `Statement executed. Rows affected: ${result.changes}`,
    });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
};

// GET /api/sql/joins - list predefined JOIN demonstrations
const getJoinQueries = (req, res) => {
  res.json({
    success: true,
    joins: JOIN_QUERIES.map(({ id, title, description }) => ({ id, title, description })),
  });
};

// GET /api/sql/joins/:id - run a predefined JOIN demonstration
const runJoinQuery = async (req, res) => {
  try {
    const join = JOIN_QUERIES.find((j) => j.id === req.params.id);
    if (!join) return res.status(404).json({ success: false, error: `Unknown join query: ${req.params.id}` });

    const start = Date.now();
    const rows = await all(join.sql);
    const executionTimeMs = Date.now() - start;

    res.json({
      success: true,
      id: join.id,
      title: join.title,
      description: join.description,
      sql: join.sql,
      rowCount: rows.length,
      columns: rows.length ? Object.keys(rows[0]) : [],
      executionTimeMs,
      rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getStatus,
  getTables,
  getTableSchema,
  getTableRows,
  runQuery,
  runStatement,
  getJoinQueries,
  runJoinQuery,
};
