import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Search, Calendar, Plus, FolderKanban, X, Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';

// Generate URL-safe slug from project title + short id suffix
const toSlug = (title = '', id = '') =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
  '-' + String(id).slice(-6);

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
        let reqs = [axios.get(`/workspaces/${ws._id}/projects`)];
        if (user?.role !== 'employee') {
          reqs.push(axios.get(`/workspaces/${ws._id}/projects/members`));
          reqs.push(axios.get(`/workspaces/${ws._id}/teams`));
        }
        
        const [projRes, membersRes, teamsRes] = await Promise.all(reqs);
        setProjects(projRes.data);

        if (user?.role !== 'employee') {
          setWorkspaceMembers((membersRes?.data || []).filter(m => m.user));
          setTeams(teamsRes?.data || []);
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
    if (!window.confirm('Are you sure you want to delete this project?')) return;
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

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-bg-primary">
      <div className="w-10 h-10 border-[4px] border-border border-t-accent-blue dark:border-t-accent-blue rounded-full animate-spin shadow-lg"></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col font-sans bg-bg-primary relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent-blue/5 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:px-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div>
              <p className="text-xs font-bold text-accent-blue uppercase tracking-[0.2em] mb-1.5 flex items-center gap-1.5">
                <Sparkles size={12} /> Workspace Projects
              </p>
              <h1 className="text-4xl font-black text-text-primary tracking-tight font-outfit drop-shadow-sm">
                Projects
              </h1>
              <p className="text-text-secondary text-sm mt-2 font-medium">
                {user?.role === 'employee' ? 'Your assigned projects' : 'Manage your workspace projects seamlessly'}
              </p>
            </div>
            {user?.role !== 'employee' && (
              <button
                onClick={() => handleOpenModal()}
                className="group relative inline-flex items-center justify-center gap-2 bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-6 py-3 rounded-2xl shadow-lg shadow-accent-blue/30 hover:shadow-xl hover:shadow-accent-blue/40 hover:-translate-y-1 transition-all duration-300 font-bold overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <Plus size={18} className="relative z-10" />
                <span className="relative z-10">New Project</span>
              </button>
            )}
          </div>

          {/* STATS BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <div className="bg-bg-secondary/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-soft hover:shadow-hover transition-all duration-300 glass group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-inner border border-blue-500/20">
                <FolderKanban size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Total Projects</p>
                <p className="text-3xl font-black text-text-primary font-outfit leading-none">{projects.length}</p>
              </div>
            </div>
            <div className="bg-bg-secondary/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-soft hover:shadow-hover transition-all duration-300 glass group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-inner border border-emerald-500/20">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Completed</p>
                <p className="text-3xl font-black text-text-primary font-outfit leading-none">{projects.filter(p => p.status === 'Completed').length}</p>
              </div>
            </div>
            <div className="bg-bg-secondary/70 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl p-5 flex items-center gap-4 shadow-soft hover:shadow-hover transition-all duration-300 glass group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-inner border border-amber-500/20">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Active Now</p>
                <p className="text-3xl font-black text-text-primary font-outfit leading-none">{projects.filter(p => p.status === 'Active').length}</p>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="bg-bg-secondary/50 backdrop-blur-md border border-border/60 rounded-3xl flex flex-col shadow-soft overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200">
            {/* Search */}
            <div className="p-6 border-b border-border/50 bg-bg-secondary/50">
              <div className="relative max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent-blue transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-primary/50 border border-border/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-text-primary font-medium focus:outline-none focus:border-accent-blue focus:ring-4 focus:ring-accent-blue/10 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Project Cards Grid */}
            <div className="p-6 lg:p-8 bg-bg-primary/30 min-h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((project, idx) => (
                  <div 
                    key={project._id} 
                    className="group bg-bg-secondary border border-border/60 hover:border-accent-blue/50 rounded-3xl p-5 flex flex-col shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden glass"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Status Indicator Bar at top */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${
                      project.status === 'Completed' ? 'from-emerald-400 to-teal-500' : 'from-blue-400 to-indigo-500'
                    }`}></div>

                    {/* Header & Actions */}
                    <div className="flex justify-between items-start mb-4 mt-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-bg-primary to-bg-secondary border border-border/50 rounded-xl flex items-center justify-center text-text-secondary shadow-sm">
                        <FolderKanban size={20} className="opacity-70" />
                      </div>
                      
                      {/* Actions */}
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                        {user?.role !== 'employee' && (
                          <>
                            <button 
                              onClick={() => handleOpenModal(project)} 
                              className="p-2 bg-bg-primary hover:bg-accent-blue hover:text-white border border-border/50 rounded-lg text-text-secondary shadow-sm transition-all"
                              title="Edit Project"
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:block px-1">Edit</span>
                            </button>
                            <button 
                              onClick={() => handleDelete(project._id)} 
                              className="p-2 bg-bg-primary hover:bg-red-500 hover:text-white border border-border/50 rounded-lg text-text-secondary shadow-sm transition-all"
                              title="Delete Project"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="mb-5 flex-1">
                      <h3 className="font-outfit text-xl font-bold text-text-primary leading-tight mb-2 group-hover:text-accent-blue transition-colors">{project.title}</h3>
                      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{project.description || 'No description provided.'}</p>
                    </div>

                    {/* Status & Date */}
                    <div className="flex items-center justify-between mb-5 bg-bg-primary/50 rounded-xl p-3 border border-border/40">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-1">Created</span>
                        <span className="text-xs font-semibold text-text-primary flex items-center">
                          <Calendar size={12} className="mr-1.5 text-text-secondary opacity-70" />
                          {( project.createdAt ? new Date(project.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "N/A" )}
                        </span>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase shadow-sm ${
                        project.status === 'Completed' ? 'text-emerald-700 bg-emerald-100 border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-800' : 'text-blue-700 bg-blue-100 border border-blue-200 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-800'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    {/* Footer: Members & Link */}
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/60">
                      <div>
                        <div className="avatar-stack">
                          {project.members?.slice(0, 4).map(m => (
                            <div key={m._id} title={m.name} className="-ml-3 first:ml-0 hover:z-10 hover:scale-110 transition-all duration-200">
                              <Avatar user={m} size="w-8 h-8" textClass="text-xs" showStatus={false} className="border-[3px] border-bg-secondary shadow-sm" />
                            </div>
                          ))}
                          {project.members?.length > 4 && (
                            <div className="h-8 w-8 rounded-full bg-bg-primary flex items-center justify-center text-text-secondary text-[10px] font-bold border-[3px] border-bg-secondary shadow-sm -ml-3 z-0">
                              +{project.members.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Link 
                        to={`/projects/${toSlug(project.title, project._id)}`} 
                        className="text-xs font-bold text-accent-blue group-hover:text-white group-hover:bg-accent-blue px-4 py-2 rounded-xl transition-all duration-300 border border-accent-blue/30 bg-accent-blue/5 shadow-sm"
                      >
                        Open Board
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-bg-secondary/30 rounded-3xl border border-dashed border-border/60 backdrop-blur-sm">
                  <div className="w-24 h-24 bg-bg-primary rounded-full flex items-center justify-center mb-6 shadow-inner border border-border/40">
                    <FolderKanban size={48} className="text-text-secondary opacity-30" />
                  </div>
                  <h3 className="font-outfit text-2xl font-black text-text-primary mb-3">No Projects Found</h3>
                  <p className="text-text-secondary text-sm max-w-md mx-auto">
                    {user?.role === 'employee' ? 'You haven\'t been assigned to any projects yet.' : 'There are no projects matching your search criteria. Create a new one to get started!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Premium CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-bg-secondary border border-border shadow-[0_32px_64px_rgba(0,0,0,0.3)] rounded-[2rem] w-full max-w-2xl animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="relative px-8 py-6 border-b border-border/50 bg-bg-primary/30 flex justify-between items-center shrink-0">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue to-accent-indigo"></div>
              <div>
                <h3 className="text-2xl font-black text-text-primary font-outfit mb-1">{editItem ? 'Edit Project' : 'Create New Project'}</h3>
                <p className="text-sm text-text-secondary font-medium">Organize work into focused projects.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-red-500 hover:bg-red-500/10 hover:rotate-90 transition-all duration-300 p-2.5 rounded-full bg-bg-secondary border border-border/50 shadow-sm">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar bg-bg-secondary">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-2.5 uppercase tracking-widest">Project Title <span className="text-red-500">*</span></label>
                    <input
                      type="text" required
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                      className="premium-input text-base"
                      placeholder="e.g. Website Redesign Q3"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-2.5 uppercase tracking-widest">Description (optional)</label>
                    <textarea
                      rows={3}
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                      className="premium-input resize-none text-base"
                      placeholder="Brief project overview, goals, and scope..."
                    />
                  </div>
                </div>

                {/* Member Assignment Section */}
                <div className="bg-bg-primary/50 p-6 rounded-3xl border border-border/60 mt-8 shadow-inner">
                  <div className="flex items-center gap-2 mb-6">
                    <Users size={18} className="text-accent-blue" />
                    <label className="block text-base font-bold text-text-primary font-outfit">Team Access & Participants</label>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mb-6">
                    {['all', 'team', 'role', 'specific'].map(type => (
                      <label key={type} className={`relative flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all duration-200 border ${
                        formData.participantType === type 
                        ? 'bg-accent-blue text-white border-transparent shadow-md shadow-accent-blue/30 scale-[1.02]' 
                        : 'bg-bg-secondary text-text-secondary border-border/80 hover:border-accent-blue/50 hover:bg-bg-primary'
                      }`}>
                        <input type="radio" name="pType" value={type} checked={formData.participantType === type} onChange={() => setFormData({...formData, participantType: type, members: type === 'specific' ? formData.members : []})} className="hidden" />
                        <span className="capitalize">{type.replace('specific', 'Select Individuals').replace('all', 'Entire Workspace')}</span>
                      </label>
                    ))}
                  </div>

                  {/* Contextual Inputs based on selection */}
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    {formData.participantType === 'team' && (
                      <select 
                        value={formData.selectedTeam} onChange={e => setFormData({...formData, selectedTeam: e.target.value})}
                        className="premium-input"
                        required
                      >
                        <option value="">-- Select a Team --</option>
                        {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                      </select>
                    )}

                    {formData.participantType === 'role' && (
                      <select 
                        value={formData.selectedRole} onChange={e => setFormData({...formData, selectedRole: e.target.value})}
                        className="premium-input"
                        required
                      >
                        <option value="super_admin">Managing Directors (MD)</option>
                        <option value="hr">Human Resources</option>
                        <option value="team_leader">Team Leaders</option>
                        <option value="employee">Employees</option>
                      </select>
                    )}

                    {formData.participantType === 'specific' && (
                      <div className="max-h-60 overflow-y-auto border border-border/80 rounded-2xl p-3 bg-bg-secondary space-y-2 custom-scrollbar shadow-inner">
                        {workspaceMembers.filter(m => m.user._id !== user._id).map(m => (
                          <label key={m.user._id} className={`flex items-center space-x-4 p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                            formData.members.includes(m.user._id) 
                            ? 'bg-accent-blue/10 border-accent-blue/30 shadow-sm' 
                            : 'hover:bg-bg-primary border-transparent'
                          }`}>
                            <div className="relative flex items-center justify-center">
                              <Avatar user={m.user} size="w-10 h-10" textClass="text-sm" showStatus={false} className="shadow-sm" />
                              {formData.members.includes(m.user._id) && (
                                <div className="absolute -bottom-1 -right-1 bg-accent-blue text-white h-5 w-5 rounded-full border-2 border-bg-secondary flex items-center justify-center shadow-sm">
                                  <CheckCircle2 size={12} />
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col flex-1">
                              <span className={`text-base font-bold ${formData.members.includes(m.user._id) ? 'text-accent-blue' : 'text-text-primary'}`}>{m.user?.name || 'Unknown'}</span>
                              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mt-0.5">{(m.role || m.user?.role || 'employee').replace('_', ' ')}</span>
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden"
                              checked={formData.members.includes(m.user._id)}
                              onChange={() => toggleMember(m.user._id)}
                            />
                          </label>
                        ))}
                        {workspaceMembers.length <= 1 && <p className="text-sm font-medium text-text-secondary p-6 text-center">No other members available in workspace.</p>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-10 pt-6 border-t border-border/50">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-text-secondary font-bold hover:bg-bg-primary hover:text-text-primary rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-8 py-3 rounded-xl hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 font-bold shadow-md shadow-accent-blue/20"
                  >
                    {editItem ? 'Save Changes' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
