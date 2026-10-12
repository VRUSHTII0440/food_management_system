import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, atlasStatus }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'donors', label: 'Donors', icon: '🤝' },
    { id: 'surplus', label: 'Surplus Food', icon: '🍲' },
    { id: 'ngos', label: 'NGOs & Shelters', icon: '🏢' },
    { id: 'requests', label: 'Food Requests', icon: '📋' },
    { id: 'pickups', label: 'Pickups & Volunteers', icon: '🚚' },
    { id: 'deliveries', label: 'Deliveries & Routes', icon: '🗺️' },
    { id: 'beneficiaries', label: 'Beneficiaries & Feedback', icon: '⭐' },
    { id: 'database', label: 'Database Operations', icon: '⚡' },
    { id: 'schema', label: 'Graph Schema', icon: '🕸️' },
    { id: 'neo4j', label: 'Neo4j Cypher CRUD', icon: '🔗' },
    { id: 'sql', label: 'SQL Operations', icon: '🗃️' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand-section">
        <div className="brand-logo-icon">🌿</div>
        <div>
          <div className="brand-title">FoodBridge Atlas</div>
          <div className="brand-subtitle">MongoDB Cloud System</div>
        </div>
      </div>

      <nav className="nav-menu">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <span style={{ fontSize: '18px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="atlas-badge">
          <span
            className={`status-dot ${atlasStatus?.status === 'CONNECTED' ? 'online' : 'offline'}`}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase' }}>
              {atlasStatus?.status === 'CONNECTED' ? 'MongoDB Atlas' : 'Atlas Offline'}
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {atlasStatus?.database || 'food_management_db'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
