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
      <div className="relative mb-8 p-6 rounded-3xl overflow-hidden bg-gradient-to-r from-bg-secondary to-bg-primary border border-border/50 shadow-[0_0_40px_rgba(0,0,0,0.03)] z-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="flex justify-between items-center relative z-20">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary tracking-tight font-outfit">Projects</h1>
            <p className="text-text-secondary text-sm mt-1.5 font-medium">
              {user?.role === 'employee' ? 'Your assigned projects' : 'Manage your workspace projects seamlessly'}
            </p>
          </div>
          {user?.role !== 'employee' && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-gradient-to-r from-accent-blue to-blue-600 text-white px-6 py-3 rounded-2xl hover:shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition-all duration-300 transform hover:-translate-y-1 text-sm font-bold flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-bg-secondary/60 backdrop-blur-md border border-border/50 rounded-3xl p-5 flex items-center space-x-5 shadow-[0_5px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="p-3 bg-accent-blue/10 rounded-2xl text-accent-blue group-hover:scale-110 transition-transform"><FolderKanban size={24} /></div>
          <div><p className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest mb-1">Total Projects</p><p className="text-3xl font-extrabold text-text-primary font-outfit leading-none">{projects.length}</p></div>
        </div>
        <div className="bg-bg-secondary/60 backdrop-blur-md border border-border/50 rounded-3xl p-5 flex items-center space-x-5 shadow-[0_5px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
          <div><p className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest mb-1">Completed</p><p className="text-3xl font-extrabold text-text-primary font-outfit leading-none">{projects.filter(p => p.status === 'Completed').length}</p></div>
        </div>
        <div className="bg-bg-secondary/60 backdrop-blur-md border border-border/50 rounded-3xl p-5 flex items-center space-x-5 shadow-[0_5px_20px_rgba(0,0,0,0.03)] hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group">
          <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-500 group-hover:scale-110 transition-transform"><Clock size={24} /></div>
          <div><p className="text-[11px] font-extrabold text-text-secondary uppercase tracking-widest mb-1">Active Now</p><p className="text-3xl font-extrabold text-text-primary font-outfit leading-none">{projects.filter(p => p.status === 'Active').length}</p></div>
        </div>
      </div>

      <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-[0_5px_30px_rgba(0,0,0,0.05)]">
        {/* Search */}
        <div className="p-6 border-b border-border/50 flex items-center gap-4 bg-bg-primary/20">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-bg-primary border border-border/50 rounded-2xl pl-12 pr-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1 p-2">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-text-secondary uppercase bg-bg-primary/30 sticky top-0 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-bold tracking-widest rounded-tl-xl">PROJECT NAME</th>
                <th className="px-6 py-4 font-bold tracking-widest w-40">ASSIGNED TO</th>
                <th className="px-6 py-4 font-bold tracking-widest w-40">CREATED</th>
                <th className="px-6 py-4 font-bold tracking-widest w-32">STATUS</th>
                {user?.role !== 'employee' && <th className="px-6 py-4 font-bold tracking-widest text-right w-40 rounded-tr-xl">ACTIONS</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => (
                <tr key={project._id} className="border-b border-border/30 hover:bg-bg-primary/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-text-primary">
                    <div className="flex items-center space-x-4">
                      <div className="p-2.5 bg-gradient-to-br from-accent-blue/20 to-purple-500/20 rounded-xl text-accent-blue shadow-sm group-hover:scale-110 transition-transform"><FolderKanban size={20} /></div>
                      <div>
                        <p className="font-outfit text-base font-bold">{project.title}</p>
                        {project.description && <p className="text-xs text-text-secondary font-medium mt-1 line-clamp-1 max-w-sm">{project.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="avatar-stack flex -space-x-2">
                      {project.members?.slice(0, 4).map(m => (
                        <div key={m._id} title={m.name} className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-blue to-purple-500 flex items-center justify-center text-white text-[11px] font-bold shadow-md border-2 border-bg-secondary relative z-10 hover:z-20 hover:scale-110 transition-transform cursor-pointer">
                          {m.name?.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members?.length > 4 && (
                        <div className="h-8 w-8 rounded-full bg-bg-primary flex items-center justify-center text-text-secondary text-[11px] font-bold border-2 border-bg-secondary shadow-md relative z-10 hover:z-20">
                          +{project.members.length - 4}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-text-secondary text-sm font-semibold">{new Date(project.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-widest uppercase shadow-sm ${
                      project.status === 'Completed' ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20' : 'text-accent-blue bg-accent-blue/10 border border-accent-blue/20'
                    }`}>
                      {project.status}
                    </span>
                  </td>
                  {user?.role !== 'employee' && (
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-4">
                      <Link to={`/project/${project._id}`} className="text-accent-blue hover:text-blue-600 text-sm font-bold transition-colors">Board</Link>
                      <button onClick={() => handleOpenModal(project)} className="text-text-secondary hover:text-accent-blue text-sm font-bold transition-colors">Edit</button>
                      <button onClick={() => handleDelete(project._id)} className="text-text-secondary hover:text-rose-500 text-sm font-bold transition-colors">Delete</button>
                    </td>
                  )}
                  {user?.role === 'employee' && (
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Link to={`/project/${project._id}`} className="text-accent-blue hover:text-blue-600 text-sm font-bold transition-colors">View Board</Link>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-20 text-text-secondary">
                    <div className="inline-flex h-20 w-20 rounded-full bg-bg-primary items-center justify-center mb-4 shadow-inner">
                      <FolderKanban size={40} className="opacity-40" />
                    </div>
                    <p className="font-semibold">{user?.role === 'employee' ? 'No projects assigned to you yet.' : 'No projects yet. Create one!'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary/90 backdrop-blur-xl border border-border/50 p-8 rounded-[2rem] w-full max-w-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] max-h-[90vh] overflow-y-auto custom-scrollbar animate-bounce-in relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent-blue to-purple-500"></div>
            
            <div className="flex justify-between items-center mb-8 mt-2">
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary font-outfit">{editItem ? 'Edit Project' : 'Create New Project'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary bg-bg-primary hover:bg-border/50 p-2.5 rounded-xl transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-2 uppercase tracking-widest">Project Title</label>
                <input
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all"
                  placeholder="e.g. Website Redesign"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-2 uppercase tracking-widest">Description (optional)</label>
                <textarea
                  rows={2}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all resize-none"
                  placeholder="Brief project overview..."
                />
              </div>

              {/* Member Assignment */}
              <div className="bg-bg-primary/50 p-6 rounded-2xl border border-border/50 mt-8 relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-accent-blue/5 rounded-full blur-xl group-hover:bg-accent-blue/10 transition-colors"></div>
                <label className="block text-sm font-extrabold text-text-primary mb-4 font-outfit relative z-10">Add Participants</label>
                
                <div className="flex flex-wrap gap-2 mb-5 relative z-10">
                  {['all', 'team', 'role', 'specific'].map(type => (
                    <label key={type} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${formData.participantType === type ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-md transform -translate-y-0.5' : 'bg-bg-secondary text-text-secondary border border-border/50 hover:bg-border/30 hover:text-text-primary'}`}>
                      <input type="radio" name="pType" value={type} checked={formData.participantType === type} onChange={() => setFormData({...formData, participantType: type, members: type === 'specific' ? formData.members : []})} className="hidden" />
                      <span className="capitalize">{type.replace('specific', 'select individuals').replace('all', 'workspace')}</span>
                    </label>
                  ))}
                </div>

                {formData.participantType === 'team' && (
                  <select 
                    value={formData.selectedTeam} onChange={e => setFormData({...formData, selectedTeam: e.target.value})}
                    className="w-full bg-bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue mb-2 relative z-10"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                )}

                {formData.participantType === 'role' && (
                  <select 
                    value={formData.selectedRole} onChange={e => setFormData({...formData, selectedRole: e.target.value})}
                    className="w-full bg-bg-secondary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue mb-2 relative z-10"
                    required
                  >
                    <option value="super_admin">Super Admins</option>
                    <option value="hr">HR</option>
                    <option value="team_leader">Team Leaders</option>
                    <option value="employee">Employees</option>
                  </select>
                )}

                {formData.participantType === 'specific' && (
                  <div className="max-h-56 overflow-y-auto border border-border/50 rounded-xl p-3 bg-bg-secondary/50 space-y-2 custom-scrollbar relative z-10">
                    {workspaceMembers.filter(m => m.user._id !== user._id).map(m => (
                      <label key={m.user._id} className={`flex items-center space-x-4 p-3 rounded-xl cursor-pointer transition-all ${formData.members.includes(m.user._id) ? 'bg-accent-blue/10 border border-accent-blue/30 shadow-sm' : 'hover:bg-bg-primary border border-transparent'}`}>
                        <div className="relative flex items-center justify-center">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm transition-colors ${formData.members.includes(m.user._id) ? 'bg-gradient-to-br from-accent-blue to-blue-600 text-white' : 'bg-bg-primary text-text-secondary border border-border/50'}`}>
                            {m.user.name?.charAt(0).toUpperCase()}
                          </div>
                          {formData.members.includes(m.user._id) && <div className="absolute -bottom-1 -right-1 bg-emerald-500 h-4 w-4 rounded-full border-2 border-bg-secondary flex items-center justify-center"><CheckCircle2 size={10} className="text-white" /></div>}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`text-sm font-extrabold ${formData.members.includes(m.user._id) ? 'text-accent-blue' : 'text-text-primary'}`}>{m.user?.name || 'Unknown'}</span>
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-0.5">{(m.role || m.user?.role || 'employee').replace('_', ' ')}</span>
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={formData.members.includes(m.user._id)}
                          onChange={() => toggleMember(m.user._id)}
                        />
                      </label>
                    ))}
                    {workspaceMembers.length <= 1 && <p className="text-xs font-bold text-text-secondary p-4 text-center">No other members available.</p>}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-6 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-text-secondary hover:text-text-primary font-bold transition-colors">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-gradient-to-r from-accent-blue to-blue-600 text-white rounded-xl hover:shadow-[0_10px_20px_rgba(59,130,246,0.3)] font-extrabold transition-all transform hover:-translate-y-0.5">
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
