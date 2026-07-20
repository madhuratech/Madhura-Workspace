import React, { useState } from 'react';
import { Save, Building, Users, Bell, Shield, CreditCard } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    workspaceName: 'Acme Corp',
    domain: 'acme.madhuraws.com',
    email: 'admin@acme.com',
    currency: 'USD ($)',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-wide">Workspace Settings</h1>
        <button 
          onClick={handleSubmit}
          className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
        >
          <Save size={16} />
          <span>Save Changes</span>
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex overflow-hidden shadow-sm">
        {/* Settings Sidebar */}
        <div className="w-64 border-r border-border p-4 space-y-1 bg-bg-primary/30">
          <button 
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'general' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Building size={18} />
            <span>General</span>
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'members' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Users size={18} />
            <span>Members & Roles</span>
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'notifications' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'security' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Shield size={18} />
            <span>Security</span>
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'billing' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <CreditCard size={18} />
            <span>Billing</span>
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-6">General Information</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Workspace Name</label>
                  <input 
                    type="text" required 
                    value={formData.workspaceName} onChange={e => setFormData({...formData, workspaceName: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Custom Domain</label>
                  <div className="flex">
                    <input 
                      type="text" 
                      value={formData.domain.split('.')[0]} 
                      onChange={e => setFormData({...formData, domain: `${e.target.value}.madhuraws.com`})}
                      className="w-full bg-bg-primary border border-r-0 border-border rounded-l-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                    <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-border bg-bg-primary text-text-secondary text-sm">
                      .madhuraws.com
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Admin Email</label>
                  <input 
                    type="email" required 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Default Currency</label>
                  <select 
                    value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  >
                    <option value="USD ($)">USD ($)</option>
                    <option value="EUR (€)">EUR (€)</option>
                    <option value="GBP (£)">GBP (£)</option>
                    <option value="INR (₹)">INR (₹)</option>
                  </select>
                </div>
                
                <div className="pt-6 mt-6 border-t border-border">
                  <h3 className="text-lg font-bold text-danger mb-2">Danger Zone</h3>
                  <p className="text-sm text-text-secondary mb-4">Once you delete a workspace, there is no going back. Please be certain.</p>
                  <button type="button" className="px-4 py-2 border border-danger text-danger hover:bg-danger hover:text-white rounded-lg transition-colors text-sm font-medium">
                    Delete Workspace
                  </button>
                </div>
              </form>
            </div>
          )}
          
          {activeTab !== 'general' && (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary animate-in fade-in duration-300">
              <Shield size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Module locked in Demo</h3>
              <p className="text-sm text-center max-w-sm">This section is part of the premium workspace plan. Upgrade to unlock members, security, and billing features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
