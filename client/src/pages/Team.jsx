import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Search, Plus, UserPlus, Shield, X, Mail } from 'lucide-react';

const Team = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'teams'
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
        
        // Fetch full workspace details to get members
        const detailRes = await axios.get(`/workspaces/${currentWs._id}`);
        // Filter out any orphaned members where user is null
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        setMembers(validMembers);
        
        // Fetch teams
        const teamsRes = await axios.get(`/workspaces/${currentWs._id}/teams`);
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
        await axios.post(`/invitations`, {
          email: formData.email,
          role: formData.role,
          designation: formData.designation,
          workspaceId: workspace._id
        });
        showToast('Invitation sent successfully!', 'success');
      }
      fetchWorkspaceData();
      handleCloseModal();
    } catch (error) {
      console.error(error);
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
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full animate-fade-in">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary font-medium">Loading workspace...</p>
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
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <UserPlus size={16} />
            <span>Invite Member</span>
          </button>
        )}
        {(currentUserRole === 'super_admin' || currentUserRole === 'hr') && activeTab === 'teams' && (
          <button 
            onClick={() => { setEditTeamItem(null); setIsTeamModalOpen(true); }}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
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
      </div>

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
            <table className="data-table">
              <thead>
              <tr>
                <th className="text-left w-16">USER</th>
                <th className="text-left">NAME</th>
                <th className="text-left">STATUS</th>
                <th className="text-left">DESIGNATION</th>
                <th className="text-left">EMAIL</th>
                <th className="text-left w-32">ROLE</th>
                <th className="text-right w-40">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr 
                  key={member.user._id} 
                  onClick={() => setViewMember(member)}
                  className="cursor-pointer hover:bg-bg-primary/50"
                >
                  <td>
                    <div className="h-8 w-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs">
                      {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </td>
                  <td className="font-bold text-text-primary">{member.user.name || 'Pending User'}</td>
                  <td>
                    <span className={`flex items-center space-x-1.5 text-xs font-semibold ${
                      member.user.presenceStatus === 'Active' || !member.user.presenceStatus ? 'text-success' :
                      member.user.presenceStatus === 'Busy' ? 'text-danger' :
                      member.user.presenceStatus === 'Break' ? 'text-warning' :
                      'text-orange-400'
                    }`}>
                      <div className={`h-2 w-2 rounded-full ${
                        member.user.presenceStatus === 'Active' || !member.user.presenceStatus ? 'bg-success' :
                        member.user.presenceStatus === 'Busy' ? 'bg-danger' :
                        member.user.presenceStatus === 'Break' ? 'bg-warning' :
                        'bg-orange-400'
                      }`}></div>
                      <span>{member.user.presenceStatus || 'Active'}</span>
                    </span>
                  </td>
                  <td className="text-text-secondary">{member.user.designation || '-'}</td>
                  <td className="text-text-secondary">{member.user.email}</td>
                  <td className="whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                      member.role === 'super_admin' ? 'text-purple-500 bg-purple-500/10' : 
                      member.role === 'hr' ? 'text-accent-blue bg-accent-blue/10' :
                      member.role === 'team_leader' ? 'text-orange-400 bg-orange-400/10' :
                      'text-success bg-success/10'
                    }`}>
                      {member.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap space-x-3">
                    {(currentUserRole === 'super_admin' || currentUserRole === 'hr') ? (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleOpenModal(member); }} className="text-accent-blue hover:underline text-sm font-medium">Edit Role</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(member.user._id); }} className="text-danger hover:underline text-sm font-medium">Remove</button>
                      </>
                    ) : (
                      <span className="text-text-secondary text-sm">No access</span>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-text-secondary">No members found.</td>
                </tr>
              )}
            </tbody>
          </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="text-left w-16">ICON</th>
                  <th className="text-left">TEAM NAME</th>
                  <th className="text-left">TEAM LEADER</th>
                  <th className="text-left w-32">MEMBERS</th>
                  <th className="text-right w-40">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team._id}>
                    <td>
                      <div className="h-8 w-8 rounded-full bg-orange-400/20 flex items-center justify-center text-orange-400 font-bold text-xs">
                        {team.name ? team.name.charAt(0).toUpperCase() : 'T'}
                      </div>
                    </td>
                    <td className="font-bold text-text-primary">{team.name}</td>
                    <td className="text-text-secondary">{team.leader?.name || 'No Leader'}</td>
                    <td className="text-text-secondary">
                      <div className="flex flex-wrap gap-1">
                        {team.members && team.members.length > 0 ? (
                          team.members.map(m => (
                            <span key={m._id} className="bg-bg-primary border border-border px-2 py-1 rounded-md text-[10px] font-medium text-text-primary">
                              {m.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-text-secondary italic">No members</span>
                        )}
                      </div>
                    </td>
                    <td className="text-right whitespace-nowrap space-x-3">
                      {(currentUserRole === 'super_admin' || currentUserRole === 'hr') ? (
                        <>
                          <button onClick={() => { setEditTeamItem(team); setIsTeamModalOpen(true); }} className="text-accent-blue hover:underline text-sm font-medium">Edit</button>
                          <button onClick={() => {
                             if(window.confirm('Delete team?')) {
                               axios.delete(`/workspaces/${workspace._id}/teams/${team._id}`)
                                .then(() => {
                                  showToast('Team deleted successfully!', 'success');
                                  fetchWorkspaceData();
                                })
                                .catch(() => showToast('Failed to delete team', 'error'));
                             }
                          }} className="text-danger hover:underline text-sm font-medium">Delete</button>
                        </>
                      ) : (
                        <span className="text-text-secondary text-sm">No access</span>
                      )}
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-text-secondary">No teams found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

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
                    <option value="super_admin">Super Admin (Full Access)</option>
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
                      leader: e.target.teamLeader.value,
                   });
                   showToast('Team updated successfully!', 'success');
                 } else {
                   await axios.post(`/workspaces/${workspace._id}/teams`, {
                      name: e.target.teamName.value,
                      leader: e.target.teamLeader.value,
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
                <input 
                  type="text" 
                  name="teamName"
                  defaultValue={editTeamItem ? editTeamItem.name : ''}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Frontend Team"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Select Team Leader</label>
                <select 
                  name="teamLeader"
                  defaultValue={editTeamItem ? (editTeamItem.leader?._id || editTeamItem.leader) : ''}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue appearance-none"
                  required
                >
                  <option value="">-- Select a Team Leader --</option>
                  {members.filter(m => m.role === 'team_leader' || m.role === 'super_admin' || m.role === 'hr').map(m => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.role.replace('_', ' ')})</option>
                  ))}
                </select>
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
              <div className="h-24 w-24 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-4xl mb-4 border-4 border-bg-secondary shadow-lg">
                {viewMember.user.name ? viewMember.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
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
