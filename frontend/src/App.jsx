import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import DonorsPage from './pages/DonorsPage';
import SurplusFoodPage from './pages/SurplusFoodPage';
import NGOsPage from './pages/NGOsPage';
import FoodRequestsPage from './pages/FoodRequestsPage';
import PickupsPage from './pages/PickupsPage';
import DeliveriesPage from './pages/DeliveriesPage';
import BeneficiariesPage from './pages/BeneficiariesPage';
import DatabaseOperationsPage from './pages/DatabaseOperationsPage';
import GraphSchemaPage from './pages/GraphSchemaPage';
import Neo4jPage from './pages/Neo4jPage';
import SqlOperationsPage from './pages/SqlOperationsPage';
import { api } from './services/api';
import './styles/App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [atlasStatus, setAtlasStatus] = useState(null);

  const checkAtlasConnection = async () => {
    try {
      const data = await api.getHealth();
      setAtlasStatus(data);
    } catch {
      setAtlasStatus({
        status: 'DISCONNECTED',
        database: 'food_management_db',
        message: 'Could not communicate with backend server at http://localhost:5000',
      });
    }
  };

  useEffect(() => {
    checkAtlasConnection();
    const interval = setInterval(checkAtlasConnection, 12000);
    return () => clearInterval(interval);
  }, []);

  const getPageInfo = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Food Donation & Redistribution Dashboard', desc: 'Live metrics, donation trends, and redistribution analytics from MongoDB Atlas.' };
      case 'donors':
        return { title: 'Donors Management', desc: 'Manage registered restaurants, caterers, supermarkets, and review historical donation records.' };
      case 'surplus':
        return { title: 'Surplus Food Inventory', desc: 'Track available surplus food batches, expiry times, and packaging specifications.' };
      case 'ngos':
        return { title: 'NGOs & Community Shelters', desc: 'Manage humanitarian non-profits, shelters, and their resident capacities.' };
      case 'requests':
        return { title: 'Food Requests & Allocation Engine', desc: 'Fulfill hunger relief demand using intelligent matching algorithms.' };
      case 'pickups':
        return { title: 'Pickups & Logistics Fleet', desc: 'Coordinate volunteers, vehicles, and timely food rescue pickups.' };
      case 'deliveries':
        return { title: 'Deliveries & Redistribution Routes', desc: 'Track deliveries to shelters with transit durations and distance metrics.' };
      case 'beneficiaries':
        return { title: 'Beneficiaries & Post-Delivery Feedback', desc: 'Record recipient groups and ratings on hygiene and delivery speed.' };
      case 'database':
        return { title: 'Database Operations (Lab Demonstration)', desc: 'Live MongoDB CRUD, JSON queries, aggregation pipelines, and index inspector.' };
      case 'schema':
        return { title: 'Relational Graph Schema', desc: 'Visual representation of document references and entity relationships.' };
      case 'neo4j':
        return { title: 'Neo4j Graph Database — Cypher CRUD', desc: 'Create, Read, Update & Delete nodes and relationships using Cypher queries on a live Neo4j AuraDB graph.' };
      case 'sql':
        return { title: 'Relational SQL Database — SQLite Operations', desc: 'Inspect the normalized SQL schema, browse tables, run SQL queries, and execute JOIN aggregations.' };
      default:
        return { title: 'Food Management System', desc: 'Connected to MongoDB Atlas' };
    }
  };

  const { title, desc } = getPageInfo();

  return (
    <div className="app-layout">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        atlasStatus={atlasStatus}
      />

      <div className="main-area">
        <Topbar
          title={title}
          description={desc}
          atlasStatus={atlasStatus}
          onRefresh={checkAtlasConnection}
        />

        <main className="content-wrapper">
          {atlasStatus && atlasStatus.status !== 'CONNECTED' && (
            <div className="alert alert-warning">
              <div>
                <strong>⚠️ MongoDB Atlas Connection Pending:</strong> {atlasStatus.message}
                <div style={{ marginTop: '6px', fontSize: '12px' }}>
                  Please ensure your <code>backend/.env</code> contains your valid MongoDB Atlas connection string.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'donors' && <DonorsPage />}
          {activeTab === 'surplus' && <SurplusFoodPage />}
          {activeTab === 'ngos' && <NGOsPage />}
          {activeTab === 'requests' && <FoodRequestsPage />}
          {activeTab === 'pickups' && <PickupsPage />}
          {activeTab === 'deliveries' && <DeliveriesPage />}
          {activeTab === 'beneficiaries' && <BeneficiariesPage />}
          {activeTab === 'database' && <DatabaseOperationsPage />}
          {activeTab === 'schema' && <GraphSchemaPage />}
          {activeTab === 'neo4j' && <Neo4jPage />}
          {activeTab === 'sql' && <SqlOperationsPage />}
        </main>
      </div>
    </div>
  );
}

export default App;
