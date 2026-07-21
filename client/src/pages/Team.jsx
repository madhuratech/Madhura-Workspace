import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Search, Plus, UserPlus, Shield, X, Mail } from 'lucide-react';

const Team = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // 'members' or 'teams'
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState('employee');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'employee' });

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
      setFormData({ name: item.user.name, email: item.user.email, password: '', role: item.role });
    } else {
      setEditItem(null);
      setFormData({ name: '', email: '', password: '', role: 'employee' });
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
        // Update role
        await axios.put(`/workspaces/${workspace._id}/members/${editItem.user._id}`, { role: formData.role });
      } else {
        // Create employee account and add to workspace
        await axios.post(`/workspaces/${workspace._id}/members`, {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
      }
      fetchWorkspaceData();
      handleCloseModal();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating member');
    }
  };

  const handleDelete = async (userId) => {
    if (!workspace) return;
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await axios.put(`/workspaces/${workspace._id}/members/${userId}`, { action: 'remove' });
        fetchWorkspaceData();
      } catch (error) {
        alert(error.response?.data?.message || 'Error removing member');
      }
    }
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading team data...</div>;
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
            onClick={() => setIsTeamModalOpen(true)}
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
                <th className="text-left">EMAIL</th>
                <th className="text-left w-32">ROLE</th>
                <th className="text-right w-40">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.user._id}>
                  <td>
                    <div className="h-8 w-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs">
                      {member.user.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                  </td>
                  <td className="font-bold text-text-primary">{member.user.name || 'Pending User'}</td>
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
                        <button onClick={() => handleOpenModal(member)} className="text-accent-blue hover:underline text-sm font-medium">Edit Role</button>
                        <button onClick={() => handleDelete(member.user._id)} className="text-danger hover:underline text-sm font-medium">Remove</button>
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
                    <td className="text-text-secondary">{team.members?.length || 0} Members</td>
                    <td className="text-right whitespace-nowrap space-x-3">
                      {(currentUserRole === 'super_admin' || currentUserRole === 'hr') ? (
                        <>
                          <button onClick={() => {
                             if(window.confirm('Delete team?')) {
                               axios.delete(`/workspaces/${workspace._id}/teams/${team._id}`)
                                .then(() => fetchWorkspaceData());
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary flex items-center">
                <Shield className="text-accent-blue mr-2" size={24}/>
                {editItem ? 'Edit Member Role' : 'Create Employee Account'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editItem && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </>
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

              {!editItem && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Temporary Password</label>
                  <input 
                    type="password" 
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                    placeholder="••••••••"
                    required
                    minLength="6"
                  />
                </div>
              )}
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
              
              <div className="flex justify-end space-x-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  {editItem ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEAM CREATION MODAL */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">Create Team</h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                 await axios.post(`/workspaces/${workspace._id}/teams`, {
                    name: e.target.teamName.value,
                    leader: e.target.teamLeader.value,
                 });
                 fetchWorkspaceData();
                 setIsTeamModalOpen(false);
              } catch(err) {
                 alert(err.response?.data?.message || 'Error creating team');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Team Name</label>
                <input 
                  type="text" 
                  name="teamName"
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Frontend Team"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Select Team Leader</label>
                <select 
                  name="teamLeader"
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue appearance-none"
                  required
                >
                  <option value="">-- Select a User --</option>
                  {members.map(m => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  Create Team
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
