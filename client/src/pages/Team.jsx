import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Search, Plus, UserPlus, Shield, X, Mail, Users } from 'lucide-react';
import Avatar from '../components/Avatar';
import OrgChart from '../components/OrgChart';

// ── Teams-style status definitions ──
const TEAMS_STATUSES = [
  {
    key: 'Active', label: 'Available',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#92C353" stroke="#92C353" /><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dotColor: '#92C353',
  },
  {
    key: 'Busy', label: 'Busy',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" /><circle cx="8" cy="8" r="3" fill="white" /></svg>,
    dotColor: '#C4314B',
  },
  {
    key: 'Break', label: 'Do not disturb',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" /><rect x="4" y="7" width="8" height="2" rx="1" fill="white" /></svg>,
    dotColor: '#C4314B',
  },
  {
    key: 'Lunch', label: 'Be right back',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" /><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dotColor: '#F8B739',
  },
  {
    key: 'Away', label: 'Appear away',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" /><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dotColor: '#F8B739',
  },
  {
    key: 'Leave', label: 'Appear offline',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 13, height: 13, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="none" stroke="#8A8886" strokeWidth="1.5" /><circle cx="8" cy="8" r="4" fill="#8A8886" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    dotColor: '#8A8886',
  },
];

const getStatusDef = (key) => TEAMS_STATUSES.find(s => s.key === key) || TEAMS_STATUSES[0];

const StatusBadge = ({ status }) => {
  const def = getStatusDef(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 20,
      background: `${def.dotColor}18`,
      border: `1px solid ${def.dotColor}35`,
      fontSize: 11, fontWeight: 600, color: def.dotColor,
      whiteSpace: 'nowrap',
    }}>
      {def.icon}
      {def.label}
    </span>
  );
};

const Team = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('org_chart'); // 'members', 'teams', 'org_chart'
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editTeamItem, setEditTeamItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [viewMember, setViewMember] = useState(null); // New state for details modal
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'employee', designation: '' });
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      // Fetch all workspaces to get the first one for context
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const currentWs = wsRes.data[0];
        setWorkspace(currentWs);
        
        // Fetch full workspace details and teams in parallel for high speed
        const [detailRes, teamsRes] = await Promise.all([
          axios.get(`/workspaces/${currentWs._id}`),
          axios.get(`/workspaces/${currentWs._id}/teams`)
        ]);
        
        // Filter out any orphaned members where user is null
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        setMembers(validMembers);
        setTeams(teamsRes.data || []);
        
        // Find current user's role
        const me = validMembers.find(m => m.user._id === user._id);
        if (me) {
          setCurrentUserRole(me.role);
        }
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({ name: item.user.name, email: item.user.email, password: '', role: item.role, designation: item.user.designation || '' });
    } else {
      setEditItem(null);
      setFormData({ name: '', email: '', password: '', role: 'employee', designation: '' });
      setSelectedTeamMembers([]);
      setNewTeamName('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspace) return;

    try {
      if (editItem) {
        // Update role and designation
        await axios.put(`/workspaces/${workspace._id}/members/${editItem.user._id}`, { role: formData.role, designation: formData.designation });
        showToast('Member updated successfully!', 'success');
      } else {
        // Send email invitation
        console.log('[DEBUG FRONTEND] Sending invitation to:', formData.email);
        const res = await axios.post(`/invitations`, {
          email: formData.email,
          role: formData.role,
          designation: formData.designation,
          workspaceId: workspace._id
        });
        console.log('[DEBUG FRONTEND] Server responded successfully:', res.data);
        showToast('Invitation sent successfully!', 'success');
      }
      fetchWorkspaceData();
      handleCloseModal();
    } catch (error) {
      console.error('[DEBUG FRONTEND] Error sending invitation:', error);
      console.error('[DEBUG FRONTEND] Server error message:', error.response?.data);
      showToast(error.response?.data?.message || 'Error updating member', 'error');
    }
  };

  const handleDelete = async (userId) => {
    if (!workspace) return;
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await axios.put(`/workspaces/${workspace._id}/members/${userId}`, { action: 'remove' });
        showToast('Member removed successfully!', 'success');
        fetchWorkspaceData();
      } catch (error) {
        console.error(error);
        showToast(error.response?.data?.message || 'Error removing member', 'error');
      }
    }
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] h-full animate-fade-in">
      <div className="w-10 h-10 border-2 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-sm text-text-secondary font-medium">Loading workspace...</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Team Management</h1>
          <p className="text-text-secondary mt-1">Manage access and roles for {workspace.name}</p>
        </div>
        {(currentUserRole === 'super_admin' || currentUserRole === 'hr' || currentUserRole === 'team_leader') && activeTab === 'members' && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-accent-text px-4 py-2 rounded-lg hover:bg-accent-indigo transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <UserPlus size={16} />
            <span>Invite Member</span>
          </button>
        )}
        {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && activeTab === 'teams' && (
          <button 
            onClick={() => { setEditTeamItem(null); setSelectedTeamMembers([]); setIsTeamModalOpen(true); }}
            className="bg-accent-blue text-accent-text px-4 py-2 rounded-lg hover:bg-accent-indigo transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button 
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'members' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          All Members
        </button>
        <button 
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'teams' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Teams
        </button>
        <button 
          onClick={() => setActiveTab('org_chart')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === 'org_chart' ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Organization Chart
        </button>
      </div>

      {activeTab === 'org_chart' ? (
        <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-bg-secondary border border-border/50">
          <OrgChart members={members} teams={teams} />
        </div>
      ) : (
      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="text" 
              placeholder="Search members..." 
              className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {activeTab === 'members' ? (
            <div className="p-4 space-y-3">
              {/* Header Row */}
              <div className="flex items-center px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider hidden md:flex">
                <div className="w-64">Member</div>
                <div className="w-32">Status</div>
                <div className="w-48">Designation</div>
                <div className="flex-1">Role</div>
                <div className="w-12 text-center"></div>
              </div>

              {members.map((member) => (
                <div 
                  key={member.user._id} 
                  onClick={() => setViewMember(member)}
                  className="group flex flex-col md:flex-row md:items-center bg-bg-primary border border-border hover:border-accent-blue/50 p-4 rounded-xl shadow-sm transition-all cursor-pointer relative"
                >
                  {/* Avatar & Name */}
                  <div className="flex items-center w-64 mb-3 md:mb-0">
                    <Avatar user={member.user} size="h-10 w-10" />
                    <div className="ml-3 truncate">
                      <p className="font-bold text-sm text-text-primary truncate">{member.user.name || 'Pending User'}</p>
                      <p className="text-[11px] text-text-secondary truncate">{member.user.email}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-44 mb-3 md:mb-0">
                    <StatusBadge status={member.user.presenceStatus || 'Active'} />
                  </div>

                  {/* Designation */}
                  <div className="w-48 mb-3 md:mb-0">
                    <p className="text-xs text-text-secondary">{member.user.designation || '-'}</p>
                  </div>

                  {/* Role */}
                  <div className="flex-1 mb-3 md:mb-0">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                      member.role === 'super_admin' ? 'text-purple-500 bg-purple-500/10 border border-purple-500/20' : 
                      member.role === 'hr' ? 'text-accent-blue bg-accent-blue/10 border border-accent-blue/20' :
                      member.role === 'team_leader' ? 'text-orange-400 bg-orange-400/10 border border-orange-400/20' :
                      'text-success bg-success/10 border border-success/20'
                    }`}>
                      {member.role.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Actions (Three dots style) */}
                  <div className="md:w-12 flex justify-end md:justify-center absolute top-4 right-4 md:static">
                    {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(member); }}
                          className="p-1.5 bg-bg-secondary hover:bg-accent-blue hover:text-white border border-border rounded-lg text-text-secondary shadow-sm transition-colors"
                          title="Edit Role"
                        >
                          <Shield size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(member.user._id); }}
                          className="p-1.5 bg-bg-secondary hover:bg-danger hover:text-white border border-border rounded-lg text-text-secondary shadow-sm transition-colors"
                          title="Remove Member"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="text-center py-12 text-text-secondary bg-bg-primary rounded-xl border border-dashed border-border">
                  <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No members found. Invite someone!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div key={team._id} className="bg-bg-primary border border-border hover:border-orange-400/50 rounded-2xl p-5 flex flex-col shadow-sm transition-all group relative">
                  
                  {/* Actions Dropdown */}
                  {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                      <button 
                        onClick={() => { 
                          setEditTeamItem(team); 
                          setSelectedTeamMembers(team.members?.map(m => m._id) || []);
                          setIsTeamModalOpen(true); 
                        }}
                        className="p-1.5 bg-bg-secondary hover:bg-accent-blue hover:text-white border border-border rounded-lg text-text-secondary shadow-sm transition-colors"
                        title="Edit Team"
                      >
                        <Shield size={14} />
                      </button>
                      <button 
                        onClick={() => {
                          if(window.confirm('Delete team?')) {
                            axios.delete(`/workspaces/${workspace._id}/teams/${team._id}`)
                             .then(() => {
                               showToast('Team deleted successfully!', 'success');
                               fetchWorkspaceData();
                             })
                             .catch(() => showToast('Failed to delete team', 'error'));
                          }
                        }}
                        className="p-1.5 bg-bg-secondary hover:bg-danger hover:text-white border border-border rounded-lg text-text-secondary shadow-sm transition-colors"
                        title="Delete Team"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Team Header */}
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-400/20 to-orange-500/20 flex items-center justify-center text-orange-400 font-bold text-xl border border-orange-400/10 shadow-sm mr-4">
                      {team.name ? team.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary text-lg">{team.name}</h3>
                      <p className="text-xs text-text-secondary flex items-center mt-0.5">
                        <Users size={12} className="mr-1" />
                        {team.members?.length || 0} Members
                      </p>
                    </div>
                  </div>

                  {/* Team Leader */}
                  <div className="bg-bg-secondary/50 rounded-xl p-3 mb-4 border border-border/50">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Team Leader</p>
                    <div className="flex items-center">
                      <Avatar user={team.leader} size="h-6 w-6" textClass="text-[10px]" showStatus={false} className="mr-2" />
                      <span className="text-sm font-medium text-text-primary">{team.leader?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Members Stack */}
                  <div className="mt-auto">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Team Members</p>
                    <div className="flex items-center flex-wrap gap-2">
                      {team.members && team.members.length > 0 ? (
                        team.members.map((m, idx) => (
                          <div 
                            key={m._id} 
                            className="flex items-center bg-bg-secondary border border-border px-2.5 py-1 rounded-full text-xs font-medium text-text-primary shadow-sm"
                          >
                            <Avatar user={m} size="h-4 w-4" textClass="text-[8px]" showStatus={false} className="mr-1.5 -ml-1" />
                            {m.name}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-text-secondary italic">No members assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {teams.length === 0 && (
                <div className="col-span-full text-center py-12 text-text-secondary bg-bg-primary rounded-xl border border-dashed border-border">
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No teams found. Create one to organize your workspace!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-md shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-text-primary flex items-center mb-1">
                  <Shield className="text-accent-blue mr-2" size={20}/>
                  {editItem ? 'Edit Member Role' : 'Send Invitation'}
                </h3>
                <p className="text-xs text-text-secondary">Invite a new member to join the workspace.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-text-secondary" size={18} />
                  <input 
                    type="email" 
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                    placeholder="e.g. name@company.com"
                    required
                    disabled={editItem !== null}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Job Title / Designation</label>
                <input 
                  type="text" 
                  value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Full Stack Developer, BDM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Access Role</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <select 
                    value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue appearance-none"
                  >
                    <option value="super_admin">MD (Managing Director)</option>
                    <option value="hr">HR (Management Access)</option>
                    <option value="team_leader">Team Leader (Assign Tasks)</option>
                    <option value="employee">Employee (Standard Access)</option>
                  </select>
                </div>
              </div>


              
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-border/50">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20"
                >
                  {editItem ? 'Save Changes' : 'Send Invite'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* TEAM CREATION / EDIT MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-md shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">{editTeamItem ? 'Edit Team' : 'Create Team'}</h3>
                <p className="text-xs text-text-secondary">Organize members into functional groups.</p>
              </div>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
            
             <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                 if (editTeamItem) {
                   await axios.put(`/workspaces/${workspace._id}/teams/${editTeamItem._id}`, {
                      name: e.target.teamName.value,
                      leader: e.target.teamLeader.value || null,
                      members: selectedTeamMembers
                   });
                   showToast('Team updated successfully!', 'success');
                 } else {
                   await axios.post(`/workspaces/${workspace._id}/teams`, {
                      name: e.target.teamName.value,
                      leader: e.target.teamLeader.value || null,
                      members: selectedTeamMembers
                   });
                   showToast('Team created successfully!', 'success');
                 }
                 fetchWorkspaceData();
                 setIsTeamModalOpen(false);
              } catch(err) {
                 console.error(err);
                 showToast(err.response?.data?.message || 'Error saving team', 'error');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Team Name</label>
                <select 
                  name="teamName"
                  defaultValue={editTeamItem ? editTeamItem.name : ''}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue appearance-none"
                  required
                >
                  <option value="" disabled>-- Select a Team Name --</option>
                  <option value="UI/UX Design">UI/UX Design</option>
                  <option value="Technical">Technical</option>
                  <option value="BDM">BDM</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Media">Media</option>
                  <option value="HR">HR</option>
                  <option value="Operations">Operations</option>
                  <option value="Sales">Sales</option>
                  <option value="Support">Support</option>
                  <option value="Management">Management</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Select Team Leader</label>
                <select 
                  name="teamLeader"
                  defaultValue={editTeamItem ? (editTeamItem.leader?._id || editTeamItem.leader) : ''}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue appearance-none"
                >
                  <option value="">-- Select a Team Leader --</option>
                  {members.filter(m => m.role === 'team_leader' || m.role === 'super_admin' || m.role === 'hr').map(m => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Team Members</label>
                <div className="bg-bg-primary border border-border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                  {members.filter(m => m.role === 'employee').map(m => (
                    <label key={m.user._id} className="flex items-center space-x-3 p-2 hover:bg-bg-secondary rounded-lg cursor-pointer transition-colors">
                      <input 
                        type="checkbox"
                        checked={selectedTeamMembers.includes(m.user._id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTeamMembers([...selectedTeamMembers, m.user._id]);
                          else setSelectedTeamMembers(selectedTeamMembers.filter(id => id !== m.user._id));
                        }}
                        className="w-4 h-4 text-accent-blue border-border rounded focus:ring-accent-blue"
                      />
                      <Avatar user={m.user} size="h-6 w-6" textClass="text-[10px]" showStatus={false} />
                      <span className="text-sm font-medium text-text-primary">{m.user.name}</span>
                    </label>
                  ))}
                  {members.length === 0 && (
                    <div className="text-sm text-text-secondary text-center p-2">No members available</div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-border/50">
                <button 
                  type="button" 
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20"
                >
                  {editTeamItem ? 'Save Changes' : 'Create Team'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MEMBER MODAL */}
      {viewMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-3xl w-full max-w-sm shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden relative">
            <button onClick={() => setViewMember(null)} className="absolute top-4 right-4 text-text-secondary hover:text-danger bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full transition-colors z-10"><X size={18} /></button>
            <div className="bg-gradient-to-b from-accent-blue/20 to-bg-secondary pt-10 pb-6 px-8 border-b border-white/5">
              <Avatar user={viewMember.user} size="h-24 w-24" textClass="text-4xl" showStatus={false} className="mb-4 border-4 border-bg-secondary shadow-lg" />
              <h3 className="text-2xl font-bold text-text-primary font-outfit text-center">{viewMember.user.name || 'Pending User'}</h3>
              <p className="text-text-secondary text-sm font-medium mt-1">{viewMember.user.designation || 'No Designation Set'}</p>
            </div>

            <div className="space-y-4 bg-bg-primary/50 p-5 rounded-2xl border border-border">
              <div>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm font-medium text-text-primary flex items-center"><Mail className="mr-2 text-accent-blue" size={14}/> {viewMember.user.email}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Access Role</p>
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      viewMember.role === 'super_admin' ? 'text-purple-500 bg-purple-500/10' : 
                      viewMember.role === 'hr' ? 'text-accent-blue bg-accent-blue/10' :
                      viewMember.role === 'team_leader' ? 'text-orange-400 bg-orange-400/10' :
                      'text-success bg-success/10'
                    }`}>
                  {viewMember.role.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Teams</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {teams.filter(t => t.members.some(m => m._id === viewMember.user._id) || (t.leader && t.leader._id === viewMember.user._id)).length > 0 ? (
                    teams.filter(t => t.members.some(m => m._id === viewMember.user._id) || (t.leader && t.leader._id === viewMember.user._id)).map(t => (
                       <span key={t._id} className="bg-bg-secondary border border-border px-2 py-1 rounded text-xs font-medium text-text-primary">
                         {t.name} {t.leader?._id === viewMember.user._id ? '(Leader)' : ''}
                       </span>
                    ))
                  ) : (
                    <span className="text-xs text-text-secondary italic">Not assigned to any teams</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
