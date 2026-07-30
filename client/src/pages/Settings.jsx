import React, { useState, useEffect, useContext } from 'react';
import { Save, Building, Users, Bell, Shield, CreditCard, Key } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // General Tab
  const [formData, setFormData] = useState({
    workspaceName: 'Acme Corp',
    domain: 'acme.madhuraws.com',
    email: 'admin@acme.com',
    currency: 'USD ($)',
  });

  // Members & Roles Tab
  const [usersList, setUsersList] = useState([]);
  
  // Notifications Tab
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true
  });

  useEffect(() => {
    if (user?.notificationSettings) {
      setNotificationSettings(user.notificationSettings);
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'members') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users');
      setUsersList(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/users/${userId}/role`, { role: newRole });
      setUsersList(usersList.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role. Ensure you are a super_admin.');
    }
  };

  const handleNotificationChange = (key) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'notifications') {
        const res = await axios.put('/users/notification-settings', { notificationSettings });
        setUser(res.data);
      } else if (activeTab === 'general') {
        // Implement general save logic if workspace update endpoint is integrated
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings', error);
      alert('Error saving settings');
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-wide">Workspace Settings</h1>
        <button 
          onClick={saveSettings}
          disabled={loading}
          className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{loading ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Changes')}</span>
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex overflow-hidden shadow-sm">
        {/* Settings Sidebar */}
        <div className="w-64 border-r border-border p-4 space-y-1 bg-bg-primary/30 shrink-0">
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
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {activeTab === 'general' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-6">General Information</h2>
              
              <form onSubmit={saveSettings} className="space-y-6">
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

          {activeTab === 'members' && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-2">Members & Roles</h2>
              <p className="text-sm text-text-secondary mb-6">Manage users and their permissions across the platform.</p>
              
              {user?.role !== 'super_admin' ? (
                <div className="p-4 bg-warning/10 border border-warning/20 text-warning rounded-lg text-sm flex items-start space-x-3">
                  <Key size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Access Denied</p>
                    <p>You must be a Super Admin to view and modify system roles.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-bg-primary border border-border rounded-lg overflow-hidden mb-8">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-secondary border-b border-border text-xs uppercase text-text-secondary">
                          <th className="px-4 py-3 font-medium">User</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Role</th>
                          <th className="px-4 py-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center py-4 text-text-secondary text-sm">Loading users...</td>
                          </tr>
                        ) : (
                          usersList.map((u) => (
                            <tr key={u._id} className="border-b border-border/50 hover:bg-bg-secondary/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-xs shrink-0">
                                    {u.name.substring(0,2).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-sm text-text-primary">{u.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-text-secondary">{u.email}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                  u.role === 'super_admin' ? 'bg-danger/10 text-danger' :
                                  u.role === 'hr' ? 'bg-accent-blue/10 text-accent-blue' :
                                  u.role === 'team_leader' ? 'bg-warning/10 text-warning' :
                                  'bg-success/10 text-success'
                                }`}>
                                  {u.role.replace('_', ' ').toUpperCase()}
                               </span>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <select 
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                  disabled={u._id === user._id}
                                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-blue disabled:opacity-50"
                                >
                                  <option value="employee">Employee</option>
                                  <option value="team_leader">Team Leader</option>
                                  <option value="hr">HR</option>
                                  <option value="super_admin">Super Admin</option>
                                </select>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-bg-secondary/50 border border-border rounded-lg p-5">
                    <h3 className="text-sm font-bold text-text-primary mb-3">Permissions Reference</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-danger uppercase mb-1">Super Admin</h4>
                        <p className="text-xs text-text-secondary">Full access to all modules, settings, user management, and global configurations.</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-accent-blue uppercase mb-1">HR</h4>
                        <p className="text-xs text-text-secondary">Manage attendance, leaves, analytics, and overview of all employee activities.</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-warning uppercase mb-1">Team Leader</h4>
                        <p className="text-xs text-text-secondary">Manage team projects, assign tasks, view team attendance, and approve leave requests.</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-success uppercase mb-1">Employee</h4>
                        <p className="text-xs text-text-secondary">View own tasks, participate in projects, use chat, email, and submit leaves/attendance.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-2">Notification Settings</h2>
              <p className="text-sm text-text-secondary mb-6">Choose how you want to be notified about activity.</p>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-bg-primary border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">Email Notifications</h4>
                    <p className="text-xs text-text-secondary mt-0.5">Receive daily digests and urgent alerts via email.</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('emailNotifications')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings.emailNotifications ? 'bg-accent-blue' : 'bg-border'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-bg-primary border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">Push Notifications</h4>
                    <p className="text-xs text-text-secondary mt-0.5">Receive real-time toast alerts while active in the app.</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('pushNotifications')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings.pushNotifications ? 'bg-accent-blue' : 'bg-border'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-bg-primary border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">Task Reminders</h4>
                    <p className="text-xs text-text-secondary mt-0.5">Get reminded about approaching deadlines.</p>
                  </div>
                  <button 
                    onClick={() => handleNotificationChange('taskReminders')}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings.taskReminders ? 'bg-accent-blue' : 'bg-border'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings.taskReminders ? 'translate-x-6' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {(activeTab === 'security' || activeTab === 'billing') && (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary animate-in fade-in duration-300">
              <Shield size={48} className="mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Module locked in Demo</h3>
              <p className="text-sm text-center max-w-sm">This section is part of the premium workspace plan. Upgrade to unlock security and billing features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
