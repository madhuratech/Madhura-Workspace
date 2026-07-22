import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Search, Calendar, Plus, FolderKanban, X, Users, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Projects = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
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
        showToast('Project updated successfully!', 'success');
      } else {
        await axios.post(`/workspaces/${workspaceId}/projects`, payload);
        showToast('Project created successfully!', 'success');
      }
      fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Error saving project', 'error');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await axios.delete(`/workspaces/${workspaceId}/projects/${projectId}`);
      setProjects(projects.filter(p => p._id !== projectId));
      showToast('Project deleted successfully!', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete project', 'error');
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

  if (loading) return null;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide font-outfit">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">
            {user?.role === 'employee' ? 'Your assigned projects' : 'Manage your workspace projects seamlessly'}
          </p>
        </div>
        {user?.role !== 'employee' && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 shadow-soft hover:shadow-hover transition-all text-sm font-semibold flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-bg-secondary border border-border rounded-2xl p-4 flex items-center space-x-4 shadow-soft hover:shadow-hover transition-all">
          <div className="p-2 bg-accent-blue/10 rounded-xl text-accent-blue"><FolderKanban size={20} /></div>
          <div><p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">Total Projects</p><p className="text-2xl font-bold text-text-primary font-outfit leading-none">{projects.length}</p></div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-2xl p-4 flex items-center space-x-4 shadow-soft hover:shadow-hover transition-all">
          <div className="p-2 bg-success/10 rounded-xl text-success"><CheckCircle2 size={20} /></div>
          <div><p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">Completed</p><p className="text-2xl font-bold text-text-primary font-outfit leading-none">{projects.filter(p => p.status === 'Completed').length}</p></div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-2xl p-4 flex items-center space-x-4 shadow-soft hover:shadow-hover transition-all">
          <div className="p-2 bg-orange-500/10 rounded-xl text-orange-500"><Clock size={20} /></div>
          <div><p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">Active Now</p><p className="text-2xl font-bold text-text-primary font-outfit leading-none">{projects.filter(p => p.status === 'Active').length}</p></div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl flex-1 flex flex-col overflow-hidden shadow-soft">
        {/* Search */}
        <div className="p-5 border-b border-border flex items-center gap-4 bg-bg-primary/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/20 transition-all shadow-sm"
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
                      <div className="p-2 bg-accent-blue/10 rounded-xl text-accent-blue"><FolderKanban size={16} /></div>
                      <div>
                        <p className="font-outfit text-sm font-semibold">{project.title}</p>
                        {project.description && <p className="text-xs text-text-secondary font-normal mt-0.5 line-clamp-1 max-w-sm">{project.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="avatar-stack">
                      {project.members?.slice(0, 4).map(m => (
                        <div key={m._id} title={m.name} className="h-7 w-7 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue text-[10px] font-bold shadow-sm">
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members?.length > 4 && (
                        <div className="h-7 w-7 rounded-full bg-bg-primary flex items-center justify-center text-text-secondary text-[10px] font-bold border-2 border-bg-secondary shadow-sm">
                          +{project.members.length - 4}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="text-text-secondary text-sm font-medium">{new Date(project.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</td>
                  <td>
                    <span className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wide uppercase ${
                      project.status === 'Completed' ? 'text-success bg-success/10 border border-success/20' : 'text-accent-blue bg-accent-blue/10 border border-accent-blue/20'
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

      {/* Premium CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border p-8 rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-bounce-in">
            <div className="flex justify-between items-center mb-8 pt-2 pb-4">
              <h3 className="text-2xl font-bold text-text-primary font-outfit">{editItem ? 'Edit Project' : 'Create New Project'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger bg-bg-primary p-2 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Project Title</label>
                <input
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="premium-input"
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Description (optional)</label>
                <textarea
                  rows={2}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="premium-input resize-none"
                  placeholder="Brief project overview..."
                />
              </div>

              {/* Member Assignment */}
              <div className="bg-bg-primary/50 p-5 rounded-2xl border border-border mt-6">
                <label className="block text-sm font-bold text-text-primary mb-4 font-outfit">Add Participants</label>
                <div className="flex flex-wrap gap-2 mb-5">
                  {['all', 'team', 'role', 'specific'].map(type => (
                    <label key={type} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${formData.participantType === type ? 'bg-accent-blue text-white shadow-soft' : 'bg-bg-secondary text-text-secondary border border-border hover:bg-border/50'}`}>
                      <input type="radio" name="pType" value={type} checked={formData.participantType === type} onChange={() => setFormData({...formData, participantType: type, members: type === 'specific' ? formData.members : []})} className="hidden" />
                      <span className="capitalize">{type.replace('specific', 'select individuals').replace('all', 'workspace')}</span>
                    </label>
                  ))}
                </div>

                {formData.participantType === 'team' && (
                  <select 
                    value={formData.selectedTeam} onChange={e => setFormData({...formData, selectedTeam: e.target.value})}
                    className="premium-input mb-2"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                )}

                {formData.participantType === 'role' && (
                  <select 
                    value={formData.selectedRole} onChange={e => setFormData({...formData, selectedRole: e.target.value})}
                    className="premium-input mb-2"
                    required
                  >
                    <option value="super_admin">Super Admins</option>
                    <option value="hr">HR</option>
                    <option value="team_leader">Team Leaders</option>
                    <option value="employee">Employees</option>
                  </select>
                )}

                {formData.participantType === 'specific' && (
                  <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-bg-secondary space-y-1.5 custom-scrollbar">
                    {workspaceMembers.filter(m => m.user._id !== user._id).map(m => (
                      <label key={m.user._id} className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.members.includes(m.user._id) ? 'bg-accent-blue/10 border border-accent-blue/20' : 'hover:bg-bg-primary border border-transparent'}`}>
                        <div className="relative flex items-center justify-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${formData.members.includes(m.user._id) ? 'bg-accent-blue text-white' : 'bg-bg-primary text-text-secondary border border-border'}`}>
                            {m.user.name?.charAt(0).toUpperCase()}
                          </div>
                          {formData.members.includes(m.user._id) && <div className="absolute -bottom-1 -right-1 bg-success h-3.5 w-3.5 rounded-full border-2 border-bg-secondary"></div>}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`text-sm font-semibold ${formData.members.includes(m.user._id) ? 'text-accent-blue' : 'text-text-primary'}`}>{m.user?.name || 'Unknown'}</span>
                          <span className="text-[10px] text-text-secondary uppercase tracking-wider">{(m.role || m.user?.role || 'employee').replace('_', ' ')}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.members.includes(m.user._id)}
                          onChange={() => toggleMember(m.user._id)}
                        />
                      </label>
                    ))}
                    {workspaceMembers.length <= 1 && <p className="text-xs text-text-secondary p-3 text-center">No other members available.</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-border mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-text-secondary hover:text-text-primary font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-accent-blue text-white rounded-xl hover:bg-blue-600 shadow-soft hover:shadow-hover font-semibold transition-all">
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
