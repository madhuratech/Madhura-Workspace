import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Search, Calendar, Plus, FolderKanban, X, Users, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Projects = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    participantType: 'all', 
    selectedTeam: '', 
    selectedRole: 'employee', 
    members: [] 
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get workspace first
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspaceId(ws._id);
        
        // Get projects (auto-filtered by role on backend)
        const projRes = await axios.get(`/workspaces/${ws._id}/projects`);
        setProjects(projRes.data);

        // Get workspace members and teams for assignment (only for super_admin/hr/team_leader)
        if (user?.role !== 'employee') {
          const membersRes = await axios.get(`/workspaces/${ws._id}/projects/members`);
          setWorkspaceMembers((membersRes.data || []).filter(m => m.user));
          
          const teamsRes = await axios.get(`/workspaces/${ws._id}/teams`);
          setTeams(teamsRes.data || []);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({ 
        title: item.title, 
        description: item.description || '', 
        participantType: 'specific',
        selectedTeam: '',
        selectedRole: 'employee',
        members: item.members.map(m => m._id) 
      });
    } else {
      setEditItem(null);
      setFormData({ 
        title: '', 
        description: '', 
        participantType: 'all', 
        selectedTeam: '', 
        selectedRole: 'employee', 
        members: [] 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId) return;

    let participantsIds = [];
    if (formData.participantType === 'all') {
      participantsIds = workspaceMembers.map(m => m.user._id);
    } else if (formData.participantType === 'team' && formData.selectedTeam) {
      const team = teams.find(t => t._id === formData.selectedTeam);
      if (team) {
        participantsIds = [...team.members.map(m => m._id || m), team.leader._id || team.leader];
      }
    } else if (formData.participantType === 'role') {
      participantsIds = workspaceMembers.filter(m => m.role === formData.selectedRole).map(m => m.user._id);
    } else if (formData.participantType === 'specific') {
      participantsIds = formData.members;
    }

    if (!participantsIds.includes(user._id)) {
      participantsIds.push(user._id);
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      members: participantsIds
    };

    try {
      if (editItem) {
        await axios.put(`/workspaces/${workspaceId}/projects/${editItem._id}`, payload);
      } else {
        await axios.post(`/workspaces/${workspaceId}/projects`, payload);
      }
      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Error saving project');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axios.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
      setProjects(projects.filter(p => p._id !== projectId));
    } catch (error) {
      alert('Failed to delete project');
    }
  };

  const toggleMember = (userId) => {
    setFormData(prev => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter(id => id !== userId)
        : [...prev.members, userId]
    }));
  };

  const filtered = projects.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8 text-text-secondary">Loading projects...</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">
            {user?.role === 'employee' ? 'Your assigned projects' : 'All workspace projects'}
          </p>
        </div>
        {user?.role !== 'employee' && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center space-x-3">
          <div className="p-2 bg-accent-blue/10 rounded-lg text-accent-blue"><FolderKanban size={20} /></div>
          <div><p className="text-xs text-text-secondary">Total</p><p className="text-xl font-bold text-text-primary">{projects.length}</p></div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center space-x-3">
          <div className="p-2 bg-success/10 rounded-lg text-success"><CheckCircle2 size={20} /></div>
          <div><p className="text-xs text-text-secondary">Completed</p><p className="text-xl font-bold text-text-primary">{projects.filter(p => p.status === 'Completed').length}</p></div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-4 flex items-center space-x-3">
          <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Clock size={20} /></div>
          <div><p className="text-xs text-text-secondary">Active</p><p className="text-xl font-bold text-text-primary">{projects.filter(p => p.status === 'Active').length}</p></div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        {/* Search */}
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-primary border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">PROJECT NAME</th>
                <th className="text-left w-40">ASSIGNED TO</th>
                <th className="text-left w-40">CREATED</th>
                <th className="text-left w-32">STATUS</th>
                {user?.role !== 'employee' && <th className="text-right w-40">ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project._id}>
                  <td className="font-bold text-text-primary">
                    <div className="flex items-center space-x-3">
                      <div className="p-1.5 bg-accent-blue/10 rounded text-accent-blue"><FolderKanban size={16} /></div>
                      <div>
                        <p>{project.title}</p>
                        {project.description && <p className="text-xs text-text-secondary font-normal mt-0.5">{project.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex -space-x-2">
                      {project.members?.slice(0, 4).map(m => (
                        <div key={m._id} title={m.name} className="h-7 w-7 rounded-full bg-accent-blue/20 border-2 border-bg-secondary flex items-center justify-center text-accent-blue text-xs font-bold">
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members?.length > 4 && (
                        <div className="h-7 w-7 rounded-full bg-border border-2 border-bg-secondary flex items-center justify-center text-text-secondary text-xs font-bold">
                          +{project.members.length - 4}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-text-secondary text-sm">{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      project.status === 'Completed' ? 'text-success bg-success/10' : 'text-accent-blue bg-accent-blue/10'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  {user?.role !== 'employee' && (
                    <td className="text-right whitespace-nowrap space-x-3">
                      <Link to={`/project/${project._id}`} className="text-accent-blue hover:underline text-sm font-medium">Board</Link>
                      <button onClick={() => handleOpenModal(project)} className="text-text-secondary hover:text-text-primary text-sm font-medium">Edit</button>
                      <button onClick={() => handleDelete(project._id)} className="text-danger hover:underline text-sm font-medium">Delete</button>
                    </td>
                  )}
                  {user?.role === 'employee' && (
                    <td className="text-right whitespace-nowrap">
                      <Link to={`/project/${project._id}`} className="text-accent-blue hover:underline text-sm font-medium">View Board</Link>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-text-secondary">
                    <FolderKanban size={36} className="mx-auto mb-3 opacity-20" />
                    <p>{user?.role === 'employee' ? 'No projects assigned to you yet.' : 'No projects yet. Create one!'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-bg-secondary z-10 pt-2 pb-4">
              <h3 className="text-xl font-bold text-text-primary">{editItem ? 'Edit Project' : 'Create New Project'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Project Title</label>
                <input
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description (optional)</label>
                <textarea
                  rows={2}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue resize-none"
                  placeholder="Brief project overview..."
                />
              </div>

              {/* Member Assignment */}
              <div className="bg-bg-primary p-4 rounded-lg border border-border">
                <label className="block text-sm font-bold text-text-primary mb-3">Add Participants By</label>
                <div className="flex flex-wrap gap-3 mb-4">
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="all" checked={formData.participantType === 'all'} onChange={() => setFormData({...formData, participantType: 'all'})} className="accent-accent-blue" />
                    <span>All Workspace Members</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="team" checked={formData.participantType === 'team'} onChange={() => setFormData({...formData, participantType: 'team'})} className="accent-accent-blue" />
                    <span>Specific Team</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="role" checked={formData.participantType === 'role'} onChange={() => setFormData({...formData, participantType: 'role'})} className="accent-accent-blue" />
                    <span>Specific Role</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="specific" checked={formData.participantType === 'specific'} onChange={() => setFormData({...formData, participantType: 'specific', members: []})} className="accent-accent-blue" />
                    <span>Select Individuals</span>
                  </label>
                </div>

                {formData.participantType === 'team' && (
                  <select 
                    value={formData.selectedTeam} onChange={e => setFormData({...formData, selectedTeam: e.target.value})}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none text-sm"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                )}

                {formData.participantType === 'role' && (
                  <select 
                    value={formData.selectedRole} onChange={e => setFormData({...formData, selectedRole: e.target.value})}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none text-sm"
                    required
                  >
                    <option value="super_admin">Super Admins</option>
                    <option value="hr">HR</option>
                    <option value="team_leader">Team Leaders</option>
                    <option value="employee">Employees</option>
                  </select>
                )}

                {formData.participantType === 'specific' && (
                  <div className="max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-bg-secondary space-y-1 custom-scrollbar">
                    {workspaceMembers.filter(m => m.user._id !== user._id).map(m => (
                      <label key={m.user._id} className="flex items-center space-x-3 p-1.5 hover:bg-bg-primary rounded-lg cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="accent-accent-blue"
                          checked={formData.members.includes(m.user._id)}
                          onChange={() => toggleMember(m.user._id)}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-text-primary">{m.user.name}</span>
                          <span className="text-[10px] text-text-secondary">{m.role.replace('_', ' ')}</span>
                        </div>
                      </label>
                    ))}
                    {workspaceMembers.length <= 1 && <p className="text-xs text-text-secondary p-1">No other members available.</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors">
                  {editItem ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
