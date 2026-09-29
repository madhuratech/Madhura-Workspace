import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Search, Plus, UserPlus, Shield, X, Mail, Users, KeyRound, RefreshCw, Eye, EyeOff, Copy, Check } from 'lucide-react';
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
  const location = useLocation();
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('org_chart'); // 'members', 'teams', 'org_chart'
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [editTeamItem, setEditTeamItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'employee', designation: '' });
  const [viewMember, setViewMember] = useState(null); // New state for details modal

  // Password reset state for Super Admin & HR
  const [resetPasswordMember, setResetPasswordMember] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  const [searchMemberQuery, setSearchMemberQuery] = useState('');

  const filteredMembers = members.filter(member => {
    if (!searchMemberQuery.trim()) return true;
    const q = searchMemberQuery.toLowerCase();
    const name = member.user?.name?.toLowerCase() || '';
    const email = member.user?.email?.toLowerCase() || '';
    const designation = member.user?.designation?.toLowerCase() || '';
    const role = member.role?.toLowerCase() || '';
    return name.includes(q) || email.includes(q) || designation.includes(q) || role.includes(q);
  });
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  // Listen for resetUser query parameter in URL (e.g. from notification click)
  useEffect(() => {
    if (members.length > 0) {
      const params = new URLSearchParams(location.search);
      const resetUserId = params.get('resetUser');
      if (resetUserId) {
        const targetMember = members.find(m => m.user && (m.user._id === resetUserId || String(m.user._id) === String(resetUserId)));
        if (targetMember && (currentUserRole === 'super_admin' || currentUserRole === 'hr')) {
          setActiveTab('members');
          handleOpenResetPassword(targetMember);
        }
      }
    }
  }, [location.search, members, currentUserRole]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleOpenResetPassword = (member) => {
    setResetPasswordMember(member);
    setNewPasswordVal(generateRandomPassword());
    setShowNewPassword(true);
    setCopiedPassword(false);
  };

  const handleCloseResetPassword = () => {
    setResetPasswordMember(null);
    setNewPasswordVal('');
    setCopiedPassword(false);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPasswordMember || !newPasswordVal.trim()) return;

    try {
      setIsResettingPassword(true);
      await axios.put(`/users/${resetPasswordMember.user._id}/reset-password`, {
        newPassword: newPasswordVal.trim()
      });
      showToast(`Password successfully reset for ${resetPasswordMember.user.name || resetPasswordMember.user.email}!`, 'success');
      handleCloseResetPassword();
    } catch (error) {
      console.error('Error resetting password:', error);
      showToast(error.response?.data?.message || 'Failed to reset password', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCopyPassword = () => {
    if (!newPasswordVal) return;
    navigator.clipboard.writeText(newPasswordVal);
    setCopiedPassword(true);
    showToast('New password copied to clipboard!', 'info');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

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
      setFormData({
        name: item.user?.name || '',
        email: item.user?.email || '',
        password: '',
        role: item.role || 'employee',
        designation: item.user?.designation || '',
        shiftStartTime: item.user?.shiftStartTime || '09:40',
        shiftEndTime: item.user?.shiftEndTime || '18:00',
      });
    } else {
      setEditItem(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'employee',
        designation: '',
        shiftStartTime: '09:40',
        shiftEndTime: '18:00',
      });
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
    if (!workspace || isSubmittingMember) return;

    setIsSubmittingMember(true);
    try {
      if (editItem) {
        // Update role, designation, name and shift hours
        await axios.put(`/workspaces/${workspace._id}/members/${editItem.user._id}`, {
          name: formData.name,
          role: formData.role,
          designation: formData.designation,
          shiftStartTime: formData.shiftStartTime || '09:40',
          shiftEndTime: formData.shiftEndTime || '18:00',
        });
        showToast('Member updated successfully!', 'success');
      } else {
        // Send email invitation with role and shift hours
        console.log('[DEBUG FRONTEND] Sending invitation to:', formData.email);
        const res = await axios.post(`/invitations`, {
          email: formData.email,
          role: formData.role,
          designation: formData.designation,
          shiftStartTime: formData.shiftStartTime || '09:40',
          shiftEndTime: formData.shiftEndTime || '18:00',
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
    } finally {
      setIsSubmittingMember(false);
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
              value={searchMemberQuery}
              onChange={(e) => setSearchMemberQuery(e.target.value)}
              placeholder="Search members by name, email, designation..." 
              className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue transition-colors"
            />
          </div>
          {searchMemberQuery && (
            <button
              onClick={() => setSearchMemberQuery('')}
              className="text-xs text-text-secondary hover:text-text-primary underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          {activeTab === 'members' ? (
            <div className="p-4 space-y-3">
              {/* Header Row */}
              <div className="flex items-center px-4 py-2 text-[10px] font-bold text-text-secondary uppercase tracking-wider hidden md:flex">
                <div className="w-64">Member</div>
                <div className="w-36">Status</div>
                <div className="w-48">Designation</div>
                <div className="flex-1">Role</div>
                <div className="w-32 text-right pr-2">Actions</div>
              </div>

              {filteredMembers.map((member) => (
                <div 
                  key={member.user._id} 
                  onClick={() => setViewMember(member)}
                  className="group flex flex-col md:flex-row md:items-center justify-between bg-bg-primary border border-border hover:border-accent-blue/50 p-3.5 md:p-4 rounded-xl shadow-sm transition-all cursor-pointer relative"
                >
                  {/* Left info sections */}
                  <div className="flex flex-col md:flex-row md:items-center flex-1 min-w-0 pr-2">
                    {/* Avatar & Name */}
                    <div className="flex items-center w-full md:w-64 mb-2.5 md:mb-0 shrink-0">
                      <Avatar user={member.user} size="h-10 w-10" />
                      <div className="ml-3 truncate">
                        <p className="font-bold text-sm text-text-primary truncate">{member.user.name || 'Pending User'}</p>
                        <p className="text-[11px] text-text-secondary truncate">{member.user.email}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-full md:w-36 mb-2 md:mb-0 shrink-0">
                      <StatusBadge status={member.user.presenceStatus || 'Active'} />
                    </div>

                    {/* Designation */}
                    <div className="w-full md:w-40 mb-2 md:mb-0 shrink-0">
                      <p className="text-xs text-text-secondary truncate">{member.user.designation || '-'}</p>
                    </div>

                    {/* Shift Timing */}
                    <div className="w-full md:w-36 mb-2 md:mb-0 shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-bg-secondary text-text-secondary border border-border">
                        {member.user.shiftStartTime || '09:40'} - {member.user.shiftEndTime || '18:00'}
                      </span>
                    </div>

                    {/* Role */}
                    <div className="flex-1 mb-2 md:mb-0">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                        member.role === 'super_admin' ? 'text-purple-500 bg-purple-500/10 border border-purple-500/20' : 
                        member.role === 'hr' ? 'text-accent-blue bg-accent-blue/10 border border-accent-blue/20' :
                        member.role === 'team_leader' ? 'text-orange-400 bg-orange-400/10 border border-orange-400/20' :
                        'text-success bg-success/10 border border-success/20'
                      }`}>
                        {member.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions Container - Fully Contained Inside Box */}
                  <div className="w-full md:w-32 flex justify-end items-center pt-2 md:pt-0 border-t md:border-t-0 border-border/40 shrink-0">
                    {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && (
                      <div className="flex items-center space-x-1.5 opacity-90 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenResetPassword(member); }}
                          className="p-1.5 bg-bg-secondary hover:bg-amber-500 hover:text-white border border-border rounded-lg text-text-secondary shadow-sm transition-colors"
                          title="Reset Password"
                        >
                          <KeyRound size={14} />
                        </button>
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
              {filteredMembers.length === 0 && (
                <div className="text-center py-12 text-text-secondary bg-bg-primary rounded-xl border border-dashed border-border">
                  <UserPlus size={32} className="mx-auto mb-3 opacity-30" />
                  <p>{searchMemberQuery ? 'No members match your search' : 'No members found. Invite someone!'}</p>
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
                          const validMemberIds = members.map(m => String(m.user._id));
                          setSelectedTeamMembers(
                            (team.members || [])
                              .filter(m => validMemberIds.includes(String(m._id)))
                              .map(m => m._id)
                          );
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
              {editItem && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                    placeholder="Full Name"
                    required
                  />
                </div>
              )}

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

              {/* Working Shift Hours Presets */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Working Shift Hours</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { label: '9:40 AM - 6:00 PM', start: '09:40', end: '18:00' },
                    { label: '10:00 AM - 5:00 PM', start: '10:00', end: '17:00' },
                    { label: '9:40 AM - 5:30 PM', start: '09:40', end: '17:30' },
                    { label: '9:00 AM - 5:00 PM', start: '09:00', end: '17:00' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, shiftStartTime: preset.start, shiftEndTime: preset.end })}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                        formData.shiftStartTime === preset.start && formData.shiftEndTime === preset.end
                          ? 'bg-accent-blue text-white border-accent-blue font-medium'
                          : 'bg-bg-primary text-text-secondary border-border hover:border-accent-blue/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Start Time (HH:MM)</label>
                    <input 
                      type="text"
                      value={formData.shiftStartTime}
                      onChange={e => setFormData({...formData, shiftStartTime: e.target.value})}
                      placeholder="09:40"
                      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">End Time (HH:MM)</label>
                    <input 
                      type="text"
                      value={formData.shiftEndTime}
                      onChange={e => setFormData({...formData, shiftEndTime: e.target.value})}
                      placeholder="18:00"
                      className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue font-mono"
                    />
                  </div>
                </div>
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
                  disabled={isSubmittingMember}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingMember}
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20 flex items-center space-x-2"
                >
                  {isSubmittingMember && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  <span>{editItem ? 'Save Changes' : 'Send Invite'}</span>
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
              <button onClick={() => setIsTeamModalOpen(false)} disabled={isSubmittingTeam} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
            
              <form onSubmit={async (e) => {
              e.preventDefault();
              if (isSubmittingTeam) return;
              const teamNameVal = e.target.teamName.value.trim();
              if (!teamNameVal) return;

              setIsSubmittingTeam(true);
              try {
                 if (editTeamItem) {
                   await axios.put(`/workspaces/${workspace._id}/teams/${editTeamItem._id}`, {
                      name: teamNameVal,
                      leader: e.target.teamLeader.value || null,
                      members: selectedTeamMembers
                   });
                   showToast('Team updated successfully!', 'success');
                 } else {
                   await axios.post(`/workspaces/${workspace._id}/teams`, {
                      name: teamNameVal,
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
              } finally {
                 setIsSubmittingTeam(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Team Name</label>
                <input 
                  type="text"
                  name="teamName"
                  defaultValue={editTeamItem ? editTeamItem.name : ''}
                  placeholder="Enter team name (e.g. Tech, Marketing, Design, Sales...)"
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder:text-text-secondary/50 transition-colors"
                  required
                />
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
                  disabled={isSubmittingTeam}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmittingTeam}
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20 flex items-center space-x-2"
                >
                  {isSubmittingTeam && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  <span>{editTeamItem ? 'Save Changes' : 'Create Team'}</span>
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
                <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Shift Hours</p>
                <div className="flex items-center text-xs font-semibold text-accent-blue bg-accent-blue/10 px-2.5 py-1.5 rounded-lg border border-accent-blue/20 w-fit">
                  <Clock size={13} className="mr-1.5" />
                  {viewMember.user?.shiftStartTime || '09:40'} — {viewMember.user?.shiftEndTime || '18:00'}
                </div>
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

              {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && (
                <div className="pt-2 border-t border-border/50">
                  <button
                    onClick={() => {
                      const target = viewMember;
                      setViewMember(null);
                      handleOpenResetPassword(target);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/30 rounded-xl font-medium text-xs transition-all shadow-sm group"
                  >
                    <KeyRound size={15} />
                    <span>Reset Employee Password</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL FOR SUPER ADMIN & HR */}
      {resetPasswordMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 rounded-2xl w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text-primary leading-tight">Reset Password</h3>
                  <p className="text-xs text-text-secondary">Provision a new password for this team member</p>
                </div>
              </div>
              <button 
                onClick={handleCloseResetPassword} 
                className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-5">
              {/* Member Summary Card */}
              <div className="flex items-center space-x-3.5 p-3.5 bg-bg-primary/70 rounded-xl border border-border">
                <Avatar user={resetPasswordMember.user} size="h-11 w-11" showStatus={false} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-bold text-text-primary truncate">{resetPasswordMember.user.name || 'Team Member'}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded-full border border-accent-blue/20 uppercase tracking-wider">
                      {resetPasswordMember.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary truncate mt-0.5">{resetPasswordMember.user.email}</p>
                </div>
              </div>

              {/* Password Field with Generator & Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">New Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newPass = generateRandomPassword();
                      setNewPasswordVal(newPass);
                      setCopiedPassword(false);
                    }}
                    className="text-xs text-amber-500 hover:text-amber-400 flex items-center space-x-1 font-medium transition-colors"
                  >
                    <RefreshCw size={12} className="animate-spin-once" />
                    <span>Generate Strong</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter or generate new password"
                    className="w-full bg-bg-primary border border-border focus:border-amber-500/80 rounded-xl pl-4 pr-20 py-2.5 text-sm text-text-primary font-mono tracking-wide focus:outline-none transition-colors"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-1.5 text-text-secondary hover:text-text-primary transition-colors rounded-lg"
                      title={showNewPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1.5 text-text-secondary hover:text-amber-500 transition-colors rounded-lg"
                      title="Copy Password to Clipboard"
                    >
                      {copiedPassword ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary mt-1.5">
                  Minimum 6 characters. Copy and securely share this temporary password with the user.
                </p>
              </div>

              {/* Notification Banner */}
              <div className="p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl flex items-start space-x-2.5 text-xs text-text-secondary">
                <span className="text-accent-blue text-sm font-bold">ℹ</span>
                <span>
                  The employee will automatically receive an in-app confirmation notification that their password was reset by an Administrator.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={handleCloseResetPassword}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-xl transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword || !newPasswordVal.trim()}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium px-5 py-2 rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center space-x-2"
                >
                  {isResettingPassword ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={15} />
                      <span>Set New Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
