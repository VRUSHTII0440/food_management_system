const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/sqlController');

// Status
router.get('/sql/status', ctrl.getStatus);

// Table inspector
router.get('/sql/tables', ctrl.getTables);
router.get('/sql/schema/:table', ctrl.getTableSchema);
router.get('/sql/rows/:table', ctrl.getTableRows);

// Raw SQL runner
router.post('/sql/query', ctrl.runQuery);       // read-only: SELECT / WITH / PRAGMA / EXPLAIN
router.post('/sql/execute', ctrl.runStatement); // writes / DDL

// Predefined JOIN demonstrations
router.get('/sql/joins', ctrl.getJoinQueries);
router.get('/sql/joins/:id', ctrl.runJoinQuery);

module.exports = router;
