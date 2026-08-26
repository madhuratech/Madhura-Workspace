import React, { useState, useEffect, useContext } from 'react';
import { Save, Building, Users, Bell, Shield, Key, Lock, HelpCircle, Info, Mail, MessageSquare, Eye, EyeOff, Book, ArrowRight, FileText, Heart } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [syncingRoles, setSyncingRoles] = useState(false);
  
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
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Members & Roles Tab
  const [usersList, setUsersList] = useState([]);
  
  // Notifications Tab
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    desktopNotifications: true,
    notificationSounds: true,
    muteAll: false,
    mentions: true,
    messages: true,
    taskAssignments: true,
    taskReminders: true,
    leaveUpdates: true,
    announcements: true,
    meetings: true
  });
  const [browserPermission, setBrowserPermission] = useState(Notification.permission);

  // Custom UI States
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    userId: null,
    newPassword: '',
    error: '',
    loading: false
  });
  const [showResetPassword, setShowResetPassword] = useState(false);

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
      
      // Auto-sync roles if there's a mismatch
      if (workspaceId && user?.role === 'super_admin') {
        const wsRes = await axios.get(`/workspaces/${workspaceId}`);
        const wsMembers = wsRes.data.members || [];
        
        let needsSync = false;
        for (const globalUser of res.data) {
          const wsMember = wsMembers.find(m => m.user && m.user._id === globalUser._id);
          if (wsMember && wsMember.role !== globalUser.role) {
            console.log(`Auto-syncing role for ${globalUser.name} from ${wsMember.role} to ${globalUser.role}`);
            await axios.put(`/workspaces/${workspaceId}/members/${globalUser._id}`, { role: globalUser.role, action: 'update' });
            needsSync = true;
          }
        }
        
        if (needsSync) {
          showToast('Roles have been auto-synchronized!', 'success');
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      if (workspaceId) {
        await axios.put(`/workspaces/${workspaceId}/members/${userId}`, { role: newRole, action: 'update' });
      } else {
        await axios.put(`/users/${userId}/role`, { role: newRole });
      }
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

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Browser does not support notifications.', 'error');
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === 'granted') {
      showToast('Desktop notifications enabled!', 'success');
      setNotificationSettings(prev => ({ ...prev, desktopNotifications: true }));
    } else {
      showToast('Desktop notifications denied.', 'error');
      setNotificationSettings(prev => ({ ...prev, desktopNotifications: false }));
    }
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
          className="bg-accent-blue text-accent-text px-4 py-2 rounded-lg hover:bg-accent-indigo transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{loading ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Changes')}</span>
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col md:flex-row overflow-hidden shadow-sm">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border p-2 md:p-4 flex md:flex-col space-x-2 md:space-x-0 space-y-0 md:space-y-1 bg-bg-primary/30 shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap">
          <button 
            onClick={() => setActiveTab('general')}
            className={`shrink-0 md:w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'general' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Building size={18} />
            <span>General</span>
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={`shrink-0 md:w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'members' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Users size={18} />
            <span>Members & Roles</span>
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`shrink-0 md:w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'notifications' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Bell size={18} />
            <span>Notifications</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`shrink-0 md:w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'security' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <Shield size={18} />
            <span>Security</span>
          </button>
          
          <div className="h-px bg-border my-2 mx-3"></div>

          <button 
            onClick={() => setActiveTab('help')}
            className={`shrink-0 md:w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
              activeTab === 'help' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
            }`}
          >
            <HelpCircle size={18} />
            <span>Help Desk</span>
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`shrink-0 md:w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
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
              
              {browserPermission !== 'granted' && (
                <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-xl p-5 mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-accent-blue text-sm">Enable desktop notifications</h3>
                    <p className="text-xs text-accent-blue/80 mt-1">Stay updated with messages and important activity even when you're working in another tab.</p>
                  </div>
                  <button 
                    onClick={handleRequestPermission}
                    className="bg-accent-blue text-accent-text px-4 py-2 rounded-lg hover:bg-accent-indigo transition-colors text-xs font-bold shrink-0"
                  >
                    Enable Notifications
                  </button>
                </div>
              )}

              <div className="space-y-6">
                
                {/* Global Settings */}
                <div>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Global</h3>
                  <div className="bg-bg-primary border border-border rounded-xl divide-y divide-border/50">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium text-text-primary text-sm">Desktop Notifications</h4>
                        <p className="text-xs text-text-secondary mt-0.5">Show notifications via your operating system.</p>
                      </div>
                      <button 
                        onClick={() => handleNotificationChange('desktopNotifications')}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings.desktopNotifications ? 'bg-accent-blue' : 'bg-border'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings.desktopNotifications ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium text-text-primary text-sm">Notification Sounds</h4>
                        <p className="text-xs text-text-secondary mt-0.5">Play a subtle sound for incoming notifications.</p>
                      </div>
                      <button 
                        onClick={() => handleNotificationChange('notificationSounds')}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings.notificationSounds ? 'bg-accent-blue' : 'bg-border'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings.notificationSounds ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="font-medium text-danger text-sm">Mute All Notifications (Do Not Disturb)</h4>
                        <p className="text-xs text-text-secondary mt-0.5">Temporarily silence all alerts and sounds.</p>
                      </div>
                      <button 
                        onClick={() => handleNotificationChange('muteAll')}
                        className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings.muteAll ? 'bg-danger' : 'bg-border'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings.muteAll ? 'translate-x-6' : 'translate-x-1'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Event Types */}
                <div>
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Notify me about</h3>
                  <div className="bg-bg-primary border border-border rounded-xl divide-y divide-border/50">
                    {[
                      { key: 'mentions', label: 'Mentions', desc: 'When someone @mentions you in a chat or task.' },
                      { key: 'messages', label: 'Messages', desc: 'Direct messages and group chats.' },
                      { key: 'taskAssignments', label: 'Task Assignments', desc: 'When you are assigned a new task.' },
                      { key: 'taskReminders', label: 'Task Reminders', desc: 'Approaching deadlines and overdue tasks.' },
                      { key: 'leaveUpdates', label: 'Leave Updates', desc: 'Leave request approvals and rejections.' },
                      { key: 'announcements', label: 'Announcements', desc: 'New posts on the notice board.' },
                      { key: 'meetings', label: 'Meeting Reminders', desc: 'Approaching scheduled meetings.' }
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between p-4">
                        <div>
                          <h4 className="font-medium text-text-primary text-sm">{item.label}</h4>
                          <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                        </div>
                        <button 
                          onClick={() => handleNotificationChange(item.key)}
                          className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${notificationSettings[item.key] ? 'bg-accent-blue' : 'bg-border'}`}
                        >
                          <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${notificationSettings[item.key] ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </button>
                      </div>
                    ))}
                  </div>
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
                      type={showCurrentPassword ? "text" : "password"} required 
                      value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      placeholder="Enter current password"
                      className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-10 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-3 text-text-secondary" />
                    <input 
                      type={showNewPassword ? "text" : "password"} required 
                      value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-10 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-3 top-3 text-text-secondary" />
                    <input 
                      type={showConfirmPassword ? "text" : "password"} required 
                      value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      placeholder="Re-enter new password"
                      className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-10 py-2.5 text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="hidden"></button>
              </form>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="max-w-4xl animate-in fade-in duration-300">
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-text-primary tracking-tight">Help & Support</h2>
                <p className="text-sm text-text-secondary mt-2">Everything you need to manage your workspace, projects, and team.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Documentation Card */}
                <div className="group relative bg-bg-secondary/20 hover:bg-bg-secondary/40 border border-border rounded-2xl p-6 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <HelpCircle size={80} />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-blue mb-5 group-hover:scale-110 transition-transform duration-300">
                    <Book size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">Documentation</h3>
                  <p className="text-sm text-text-secondary mb-4">Detailed guides on setting up your workspace, managing roles, and workflows.</p>
                  <a href="#" className="inline-flex items-center text-sm font-bold text-accent-blue hover:text-accent-indigo transition-colors">
                    Read the docs <ArrowRight size={14} className="ml-1" />
                  </a>
                </div>

                {/* Contact Support Card */}
                <div className="group relative bg-bg-secondary/20 hover:bg-bg-secondary/40 border border-border rounded-2xl p-6 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Mail size={80} />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-accent-indigo/10 flex items-center justify-center text-accent-indigo mb-5 group-hover:scale-110 transition-transform duration-300">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">Contact Support</h3>
                  <p className="text-sm text-text-secondary mb-4">Email our dedicated support team. Average response time is under 2 hours.</p>
                  <a href="mailto:support@madhuratech.com" className="inline-flex items-center text-sm font-bold text-accent-indigo hover:opacity-80 transition-opacity">
                    support@madhuratech.com <ArrowRight size={14} className="ml-1" />
                  </a>
                </div>
              </div>

              {/* Quick Links / FAQs */}
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Popular Resources</h3>
              <div className="bg-bg-primary border border-border rounded-xl divide-y divide-border/50">
                <a href="#" className="flex items-center justify-between p-4 hover:bg-bg-secondary/30 transition-colors group">
                  <div className="flex items-center space-x-3">
                    <FileText size={18} className="text-text-secondary group-hover:text-accent-blue transition-colors" />
                    <span className="text-sm font-medium text-text-primary">How to create and manage projects</span>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" />
                </a>
                <a href="#" className="flex items-center justify-between p-4 hover:bg-bg-secondary/30 transition-colors group">
                  <div className="flex items-center space-x-3">
                    <Users size={18} className="text-text-secondary group-hover:text-accent-blue transition-colors" />
                    <span className="text-sm font-medium text-text-primary">Understanding User Roles & Permissions</span>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" />
                </a>
                <a href="#" className="flex items-center justify-between p-4 hover:bg-bg-secondary/30 transition-colors group">
                  <div className="flex items-center space-x-3">
                    <Shield size={18} className="text-text-secondary group-hover:text-accent-blue transition-colors" />
                    <span className="text-sm font-medium text-text-primary">Configuring Security & Notification Settings</span>
                  </div>
                  <ArrowRight size={16} className="text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform" />
                </a>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-3xl animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row gap-10 items-start mt-6">
                
                {/* Brand / Logo Section */}
                <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-bg-secondary to-bg-primary border border-border flex items-center justify-center text-text-primary text-5xl font-bold shadow-xl mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-accent-blue/10"></div>
                    <span className="relative z-10 font-outfit">M</span>
                  </div>
                  
                  <h2 className="text-3xl font-bold text-text-primary tracking-tight font-outfit mb-2">Madhura Workspace</h2>
                  <p className="text-sm text-text-secondary max-w-sm leading-relaxed mb-6">
                    A premium, minimalist workspace management solution engineered for modern teams. Built with a focus on speed, aesthetics, and flawless collaboration.
                  </p>

                  <div className="flex items-center space-x-4 text-xs font-bold text-text-secondary uppercase tracking-wider">
                    <a href="#" className="hover:text-accent-blue transition-colors">Terms</a>
                    <span className="w-1 h-1 rounded-full bg-border"></span>
                    <a href="#" className="hover:text-accent-blue transition-colors">Privacy</a>
                    <span className="w-1 h-1 rounded-full bg-border"></span>
                    <a href="#" className="hover:text-accent-blue transition-colors">Licenses</a>
                  </div>
                </div>

                {/* System Info Section */}
                <div className="flex-1 w-full bg-bg-secondary/20 border border-border rounded-2xl p-6">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-5">System Information</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm text-text-secondary">Version</span>
                      <span className="text-sm font-bold text-text-primary bg-bg-primary px-3 py-1 rounded-md border border-border">2.0.0</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm text-text-secondary">Build Channel</span>
                      <span className="text-sm font-bold text-accent-blue">Stable Release</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-border/50">
                      <span className="text-sm text-text-secondary">Environment</span>
                      <span className="text-sm font-bold text-success flex items-center">
                        <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse"></div>
                        Production
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-text-secondary">Developer</span>
                      <span className="text-sm font-bold text-text-primary">Madhura Tech Team</span>
                    </div>
                  </div>
                </div>

              </div>
              
              <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-text-secondary">
                <p>© {new Date().getFullYear()} Madhura Tech. All rights reserved.</p>
                <p className="flex items-center">Made with <Heart size={12} className="mx-1 text-danger fill-danger" /> for seamless collaboration.</p>
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
                type={showResetPassword ? "text" : "password"}
                placeholder="New Password (min 6 chars)"
                autoFocus
                value={resetModal.newPassword}
                onChange={(e) => setResetModal({ ...resetModal, newPassword: e.target.value, error: '' })}
                className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
                onKeyDown={(e) => { if (e.key === 'Enter') submitResetPassword(); }}
              />
              <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
                className="px-4 py-2 bg-accent-blue text-accent-text rounded-lg text-sm font-medium hover:bg-accent-indigo transition-colors disabled:opacity-50 flex items-center"
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
