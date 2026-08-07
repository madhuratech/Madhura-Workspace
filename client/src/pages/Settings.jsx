import React, { useState, useEffect, useContext } from 'react';
import { Save, Building, Users, Bell, Shield, Key, Lock, HelpCircle, Info, Mail, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Workspace ID tracking for General Tab
  const [workspaceId, setWorkspaceId] = useState(null);

  // General Tab
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Security Tab (Change Password)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  // Members & Roles Tab
  const [usersList, setUsersList] = useState([]);
  
  // Notifications Tab
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true
  });

  // Custom UI States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [resetModal, setResetModal] = useState({ isOpen: false, userId: null, newPassword: '', error: '', loading: false });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    if (user?.notificationSettings) {
      setNotificationSettings(user.notificationSettings);
    }
  }, [user]);

  // Load Initial Workspace Data for General Tab
  useEffect(() => {
    const loadWorkspace = async () => {
      try {
        const res = await axios.get('/workspaces');
        if (res.data && res.data.length > 0) {
          const ws = res.data[0]; // Assuming user configures their primary workspace
          setWorkspaceId(ws._id);
          setFormData({
            name: ws.name || '',
            description: ws.description || '',
            companyEmail: ws.companyEmail || '',
          });
        }
      } catch (error) {
        console.error('Error fetching workspace:', error);
      }
    };
    loadWorkspace();
  }, []);

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
      showToast('Role updated successfully', 'success');
    } catch (error) {
      console.error('Error updating role:', error);
      showToast('Failed to update role. Ensure you are a super_admin.', 'error');
    }
  };

  const handleNotificationChange = (key) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleResetPassword = (userId) => {
    setResetModal({ isOpen: true, userId, newPassword: '', error: '', loading: false });
  };

  const submitResetPassword = async () => {
    const { userId, newPassword } = resetModal;
    if (newPassword.length < 6) {
      setResetModal(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
      return;
    }
    setResetModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await axios.put(`/users/${userId}/reset-password`, { newPassword });
      setResetModal({ isOpen: false, userId: null, newPassword: '', error: '', loading: false });
      showToast('Password reset successfully. Share it securely.', 'success');
    } catch (error) {
      console.error('Error resetting password:', error);
      setResetModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.message || 'Failed to reset password' 
      }));
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPasswordError('');
    try {
      if (activeTab === 'notifications') {
        const res = await axios.put('/users/notification-settings', { notificationSettings });
        setUser(res.data);
      } else if (activeTab === 'general' && workspaceId) {
        // Save Workspace Data
        await axios.put(`/workspaces/${workspaceId}`, { 
          name: formData.name,
          description: formData.description,
          companyEmail: formData.companyEmail
        });
      } else if (activeTab === 'security') {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
          setPasswordError('New passwords do not match');
          setLoading(false);
          return;
        }
        if (passwordData.newPassword.length < 6) {
          setPasswordError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await axios.put('/users/change-password', {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings', error);
      if (activeTab === 'security') {
        setPasswordError(error.response?.data?.message || 'Failed to change password');
      } else {
        showToast('Error saving settings', 'error');
      }
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
          className="bg-[#1b2b4c] text-white hover:text-[#ffca22] px-4 py-2 rounded-lg hover:bg-[#1b2b4c]/90 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
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
          
          <div className="h-px bg-border my-2 mx-3"></div>

          <button 
            onClick={() => setActiveTab('help')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'help' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <HelpCircle size={18} />
            <span>Help Desk</span>
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'about' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Info size={18} />
            <span>About</span>
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
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter workspace name"
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Description</label>
                  <textarea 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Briefly describe this workspace"
                    rows={4}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  ></textarea>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Company Email (for Invitations)</label>
                  <input 
                    type="email" 
                    value={formData.companyEmail || ''} onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                    placeholder="e.g. hr@company.com"
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                  />
                  <p className="text-xs text-text-secondary mt-2">Emails will be sent from this address (Note: Domain must be verified with Resend).</p>
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
                    <p>You must be an MD (Managing Director) to view and modify system roles.</p>
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
                              <td className="px-4 py-3 text-sm flex items-center space-x-2">
                                <select 
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                  disabled={u._id === user._id}
                                  className="bg-bg-secondary border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-blue disabled:opacity-50"
                                >
                                  <option value="employee">Employee</option>
                                  <option value="team_leader">Team Leader</option>
                                  <option value="hr">HR</option>
                                  <option value="super_admin">MD (Managing Director)</option>
                                </select>
                                <button
                                  onClick={() => handleResetPassword(u._id)}
                                  title="Reset Password"
                                  className="p-1.5 text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 rounded transition-colors"
                                >
                                  <Key size={14} />
                                </button>
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
                        <h4 className="text-xs font-bold text-danger uppercase mb-1">MD (Managing Director)</h4>
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

          {activeTab === 'security' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-2">Security Settings</h2>
              <p className="text-sm text-text-secondary mb-6">Manage your password and secure your account.</p>

              <form onSubmit={saveSettings} className="space-y-6">
                {passwordError && (
                  <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm">
                    {passwordError}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Current Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-text-secondary" />
                    <input 
                      type="password" required 
                      value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="Enter current password"
                      className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-3 text-text-secondary" />
                    <input 
                      type="password" required 
                      value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-3 text-text-secondary" />
                    <input 
                      type="password" required 
                      value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="Re-enter new password"
                      className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                  </div>
                </div>
                <button type="submit" className="hidden"></button>
              </form>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="max-w-2xl animate-in fade-in duration-300">
              <h2 className="text-xl font-bold text-text-primary mb-2">Help & Support</h2>
              <p className="text-sm text-text-secondary mb-8">We're here to help you get the most out of Madhura Workspace.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-bg-primary border border-border rounded-xl p-5 hover:border-accent-blue transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-4 group-hover:scale-110 transition-transform">
                    <Mail size={20} />
                  </div>
                  <h3 className="font-bold text-text-primary mb-1">Email Support</h3>
                  <p className="text-xs text-text-secondary mb-3">Get in touch with our team directly.</p>
                  <a href="mailto:support@madhuratech.com" className="text-sm font-medium text-accent-blue hover:underline">support@madhuratech.com</a>
                </div>
                
                <div className="bg-bg-primary border border-border rounded-xl p-5 hover:border-accent-blue transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare size={20} />
                  </div>
                  <h3 className="font-bold text-text-primary mb-1">Live Chat</h3>
                  <p className="text-xs text-text-secondary mb-3">Chat with our support agents instantly.</p>
                  <span className="text-sm font-medium text-purple-500">Available 9 AM - 6 PM</span>
                </div>
              </div>

              <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-xl p-6 flex items-start space-x-4">
                <HelpCircle size={24} className="text-accent-blue shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-text-primary mb-1">Frequently Asked Questions</h3>
                  <p className="text-sm text-text-secondary mb-3">Find quick answers to common questions about workspace setup, roles, and integrations.</p>
                  <button className="text-sm font-medium text-accent-blue hover:underline">Visit Help Center →</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-2xl animate-in fade-in duration-300 flex flex-col items-center text-center mt-10">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-blue to-accent-indigo flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-6">
                M
              </div>
              <h2 className="text-3xl font-bold text-text-primary mb-2 font-outfit tracking-wide">Madhura Workspace</h2>
              <p className="text-sm font-medium text-accent-blue mb-8 bg-accent-blue/10 px-4 py-1 rounded-full">Version 1.0.0 (Build 42)</p>
              
              <div className="max-w-lg">
                <p className="text-text-secondary leading-relaxed mb-8">
                  A premium workspace management solution designed for seamless collaboration, robust team tracking, and efficient workflow execution. Built with modern web technologies for uncompromising performance and aesthetics.
                </p>
                
                <div className="flex items-center justify-center space-x-6 text-sm font-medium text-text-secondary border-t border-border pt-8">
                  <a href="#" className="hover:text-accent-blue transition-colors">Terms of Service</a>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <a href="#" className="hover:text-accent-blue transition-colors">Privacy Policy</a>
                  <span className="w-1 h-1 rounded-full bg-border"></span>
                  <a href="#" className="hover:text-accent-blue transition-colors">Licenses</a>
                </div>
                
                <p className="text-xs text-text-secondary/60 mt-8">
                  © 2026 Madhura Tech. All rights reserved.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Reset Password Modal */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-bg-secondary border border-border shadow-2xl rounded-2xl w-full max-w-sm p-6 transform transition-all animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue">
                <Key size={20} />
              </div>
              <h2 className="text-lg font-bold text-text-primary font-outfit">Reset Password</h2>
            </div>
            
            <p className="text-sm text-text-secondary mb-5">
              Enter a new secure password for this user.
            </p>

            {resetModal.error && (
              <div className="p-2 mb-4 bg-danger/10 border border-danger/20 text-danger rounded-lg text-xs font-medium">
                {resetModal.error}
              </div>
            )}

            <div className="mb-6 relative">
              <Lock size={16} className="absolute left-3 top-3 text-text-secondary" />
              <input 
                type="password"
                placeholder="New Password (min 6 chars)"
                autoFocus
                value={resetModal.newPassword}
                onChange={(e) => setResetModal({ ...resetModal, newPassword: e.target.value, error: '' })}
                className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                onKeyDown={(e) => { if (e.key === 'Enter') submitResetPassword(); }}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setResetModal({ isOpen: false, userId: null, newPassword: '', error: '', loading: false })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-primary transition-colors"
                disabled={resetModal.loading}
              >
                Cancel
              </button>
              <button 
                onClick={submitResetPassword}
                disabled={resetModal.loading}
                className="px-4 py-2 bg-[#1b2b4c] text-white hover:text-[#ffca22] rounded-lg text-sm font-medium hover:bg-[#1b2b4c]/90 transition-colors disabled:opacity-50 flex items-center"
              >
                {resetModal.loading ? 'Saving...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 border shadow-2xl rounded-xl p-4 min-w-[280px] animate-in slide-in-from-bottom-5 z-[110] flex items-center space-x-3
          ${toast.type === 'error' ? 'bg-danger/10 border-danger/20 text-danger' : 'bg-bg-secondary border-border text-text-primary'}
        `}>
          {toast.type === 'error' ? (
            <div className="h-2 w-2 rounded-full bg-danger"></div>
          ) : (
            <div className="h-2 w-2 rounded-full bg-success"></div>
          )}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}

    </div>
  );
};

export default Settings;
