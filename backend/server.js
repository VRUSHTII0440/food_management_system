const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, getStatus } = require('./config/db');
const { connectNeo4j, getNeo4jStatus } = require('./config/neo4j');
const { connectSqlite, getSqliteStatus } = require('./config/sqlite');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Health & Atlas status check
app.get('/api/health', (req, res) => {
  const status = getStatus();
  const sqlite = getSqliteStatus();
  res.json({
    status: status.isConnected ? 'CONNECTED' : 'DISCONNECTED',
    database: status.dbName,
    host: status.host,
    readyState: status.readyState,
    sqlite: {
      status: sqlite.isConnected ? 'CONNECTED' : 'DISCONNECTED',
      database: sqlite.database,
    },
    message: status.isConnected
      ? 'Successfully connected to MongoDB Atlas Cloud Database'
      : 'Not connected to MongoDB Atlas. Please configure MONGODB_URI in backend/.env',
  });
});

// Mount Routes
const apiRoutes = require('./routes/apiRoutes');
const advancedRoutes = require('./routes/advancedRoutes');
const neo4jRoutes = require('./routes/neo4jRoutes');
const sqlRoutes = require('./routes/sqlRoutes');

app.use('/api', apiRoutes);
app.use('/api', advancedRoutes);
app.use('/api', neo4jRoutes);
app.use('/api', sqlRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Start Server & Connect to DBs
const startServer = async () => {
  // Connect to MongoDB Atlas
  await connectDB();

  // Connect to Neo4j (optional – logs warning if not configured)
  await connectNeo4j();

  // Connect to the relational SQLite database (optional – logs warning if missing)
  await connectSqlite();

  app.listen(PORT, () => {
    console.log(`🚀 Food Management System Server running on http://localhost:${PORT}`);
    const neo4jStatus = getNeo4jStatus();
    if (neo4jStatus.isConnected) {
      console.log(`🔗 Neo4j Connected: ${neo4jStatus.address}`);
    } else {
      console.log('ℹ️  Neo4j: not configured (add NEO4J_URI / NEO4J_USER / NEO4J_PASSWORD to backend/.env)');
    }
    const sqliteStatus = getSqliteStatus();
    if (sqliteStatus.isConnected) {
      console.log(`🗃️  SQLite Connected: ${sqliteStatus.database}`);
    } else {
      console.log('ℹ️  SQLite: not connected');
    }
  });
};

startServer();

module.exports = app;
