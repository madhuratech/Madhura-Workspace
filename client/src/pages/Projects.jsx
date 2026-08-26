import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Search, Calendar, Plus, FolderKanban, X, Users, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
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
    members: [],
    coordinator: '',
    workflowTeams: { uiux: '', tech: '', test: '', devops: '' }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');

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
        projectType: item.projectType ? (Array.isArray(item.projectType) ? item.projectType : [item.projectType]) : ['Software'],
        participantType: 'specific',
        selectedTeam: '',
        selectedRole: 'employee',
        members: item.members.map(m => m._id),
        coordinator: item.coordinator?._id || item.coordinator || '',
        workflowTeams: {
          uiux: item.workflowTeams?.uiux?._id || item.workflowTeams?.uiux || '',
          tech: item.workflowTeams?.tech?._id || item.workflowTeams?.tech || '',
          test: item.workflowTeams?.test?._id || item.workflowTeams?.test || '',
          devops: item.workflowTeams?.devops?._id || item.workflowTeams?.devops || '',
          digitalMarketing: item.workflowTeams?.digitalMarketing?._id || item.workflowTeams?.digitalMarketing || '',
          seo: item.workflowTeams?.seo?._id || item.workflowTeams?.seo || ''
        }
      });
    } else {
      setEditItem(null);
      setFormData({ 
        title: '', 
        description: '', 
        projectType: ['Software'],
        participantType: 'all', 
        selectedTeam: '', 
        selectedRole: 'employee', 
        members: [],
        coordinator: '',
        workflowTeams: { uiux: '', tech: '', test: '', devops: '', digitalMarketing: '', seo: '' }
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId) return;

    let participantsIds = [];
    if (formData.participantType === 'all') {
      participantsIds = workspaceMembers.filter(m => m.role !== 'super_admin').map(m => m.user._id);
    } else if (formData.participantType === 'team' && formData.selectedTeam) {
      const team = teams.find(t => t._id === formData.selectedTeam);
      if (team) {
        participantsIds = [...team.members.map(m => m._id || m), team.leader._id || team.leader];
      }
    } else if (formData.participantType === 'role') {
      participantsIds = workspaceMembers.filter(m => m.role === formData.selectedRole && m.role !== 'super_admin').map(m => m.user._id);
    } else if (formData.participantType === 'specific') {
      participantsIds = formData.members;
    }

    if (!participantsIds.includes(user._id)) {
      participantsIds.push(user._id);
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      projectType: formData.projectType,
      members: participantsIds,
      coordinator: formData.coordinator || undefined,
      workflowTeams: {
        uiux: formData.workflowTeams.uiux || undefined,
        tech: formData.workflowTeams.tech || undefined,
        test: formData.workflowTeams.test || undefined,
        devops: formData.workflowTeams.devops || undefined,
        digitalMarketing: formData.workflowTeams.digitalMarketing || undefined,
        seo: formData.workflowTeams.seo || undefined
      }
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

  const filtered = projects.filter(p => {
    const matchesSearch = p.title?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'All') return matchesSearch;
    return matchesSearch && p.projectType && p.projectType.includes(filterType);
  });

  if (loading) return (
    <div className="h-full flex flex-col font-sans p-6 md:p-8 bg-bg-primary overflow-hidden">
      {/* Skeleton header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="h-8 w-36 bg-border rounded-xl animate-pulse mb-2"></div>
          <div className="h-4 w-56 bg-border/60 rounded-lg animate-pulse"></div>
        </div>
        <div className="h-10 w-32 bg-border rounded-xl animate-pulse"></div>
      </div>
      {/* Skeleton stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[1,2,3].map(i => (
          <div key={i} className="bg-bg-secondary border border-border rounded-xl p-3 flex items-center space-x-3">
            <div className="h-8 w-8 bg-border rounded-lg animate-pulse"></div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 bg-border/60 rounded animate-pulse"></div>
              <div className="h-6 w-10 bg-border rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
      {/* Skeleton cards */}
      <div className="bg-bg-secondary border border-border rounded-2xl flex-1 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-bg-primary border border-border rounded-xl p-4 overflow-hidden">
              <div className="h-1 w-full bg-border/50 rounded mb-4 animate-pulse"></div>
              <div className="h-4 w-20 bg-border rounded mb-4 animate-pulse"></div>
              <div className="h-5 w-3/4 bg-border rounded-lg animate-pulse mb-2"></div>
              <div className="h-3 w-full bg-border/60 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-4/5 bg-border/60 rounded animate-pulse mb-6"></div>
              <div className="h-10 w-full bg-border/40 rounded-lg animate-pulse mb-4"></div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <div className="flex -space-x-2">
                  {[1,2,3].map(j => <div key={j} className="h-6 w-6 rounded-full bg-border animate-pulse border-2 border-bg-secondary"></div>)}
                </div>
                <div className="h-6 w-20 bg-border/60 rounded-md animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col font-sans p-6 md:p-8 bg-bg-primary overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide font-outfit">Projects</h1>
          <p className="text-text-secondary text-sm mt-1">
            {user?.role === 'employee' ? 'Your assigned projects' : 'Manage your workspace projects seamlessly'}
          </p>
        </div>
        {(['super_admin', 'hr'].includes(user?.role) || (user?.designation || '').toLowerCase().includes('coordinator')) && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-accent-text px-5 py-2.5 rounded-xl hover:bg-accent-indigo shadow-soft hover:shadow-hover transition-all text-sm font-semibold flex items-center space-x-2"
          >
            <Plus size={18} />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-bg-secondary border border-border rounded-xl p-3 flex items-center space-x-3 shadow-soft hover:shadow-hover transition-all">
          <div className="p-1.5 bg-accent-blue/10 rounded-lg text-accent-blue"><FolderKanban size={16} /></div>
          <div><p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-0">Total Projects</p><p className="text-xl font-bold text-text-primary font-outfit leading-none mt-0.5">{projects.length}</p></div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 flex items-center space-x-3 shadow-soft hover:shadow-hover transition-all">
          <div className="p-1.5 bg-success/10 rounded-lg text-success"><CheckCircle2 size={16} /></div>
          <div><p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-0">Completed</p><p className="text-xl font-bold text-text-primary font-outfit leading-none mt-0.5">{projects.filter(p => p.status === 'Completed').length}</p></div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-xl p-3 flex items-center space-x-3 shadow-soft hover:shadow-hover transition-all">
          <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-500"><Clock size={16} /></div>
          <div><p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider mb-0">Active Now</p><p className="text-xl font-bold text-text-primary font-outfit leading-none mt-0.5">{projects.filter(p => p.status === 'Active').length}</p></div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-2xl flex-1 flex flex-col overflow-hidden shadow-soft">
        {/* Search & Filters */}
        <div className="p-4 md:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-bg-secondary z-10 shadow-sm shrink-0">
          <div className="flex-1">
            {['super_admin', 'hr'].includes(user?.role) && (
              <div className="flex items-center gap-2 pt-1 pb-2 px-1 overflow-x-auto no-scrollbar whitespace-nowrap">
                {['All', 'Software', 'Website', 'SaaS', 'PaaS', 'Digital Marketing', 'SEO'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all shadow-sm border ${
                      filterType === tab 
                        ? 'bg-accent-blue text-white border-accent-blue' 
                        : 'bg-bg-secondary text-text-secondary border-border hover:bg-border/50 hover:text-text-primary'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative w-full md:max-w-xs shrink-0">
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

        {/* Project Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-bg-primary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <div 
                key={project._id} 
                className="group bg-bg-secondary border border-border hover:border-accent-blue/50 rounded-xl p-4 flex flex-col shadow-sm transition-all relative overflow-hidden"
              >
                {/* Status Indicator Bar at top */}
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  project.status === 'Completed' ? 'bg-success' : 'bg-accent-blue'
                }`}></div>

                {/* Header & Actions */}
                <div className="flex justify-between items-start mb-3 mt-1">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-accent-blue/10 rounded-lg text-accent-blue shadow-sm border border-accent-blue/10">
                        <FolderKanban size={16} />
                      </div>
                      <h3 className="font-bold text-text-primary text-base font-outfit leading-tight group-hover:text-accent-blue transition-colors">{project.title}</h3>
                    </div>
                    {/* Project Type Tags */}
                    {project.projectType && project.projectType.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.projectType.map(type => (
                          <span key={type} className="bg-bg-primary border border-border text-[9px] font-bold uppercase tracking-wider text-text-secondary px-2 py-0.5 rounded-full">
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions Dropdown / Icons */}
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {(['super_admin', 'hr'].includes(user?.role) || (user?.designation || '').toLowerCase().includes('coordinator')) && (
                      <>
                        <button 
                          onClick={() => handleOpenModal(project)} 
                          className="p-1 bg-bg-primary hover:bg-accent-blue hover:text-white border border-border rounded-md text-text-secondary shadow-sm transition-colors"
                          title="Edit Project"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1">Edit</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(project._id)} 
                          className="p-1 bg-bg-primary hover:bg-danger hover:text-white border border-border rounded-md text-text-secondary shadow-sm transition-colors"
                          title="Delete Project"
                        >
                          <X size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mb-3 flex-1">
                  <h3 className="font-outfit text-base font-bold text-text-primary leading-tight mb-0.5">{project.title}</h3>
                  <p className="text-[11px] text-text-secondary line-clamp-2">{project.description || 'No description provided.'}</p>
                </div>

                {/* Status & Date */}
                <div className="flex items-center justify-between mb-3 bg-bg-primary rounded-lg p-2 border border-border/50">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-bold text-text-secondary uppercase tracking-wider mb-0.5">Created</span>
                    <span className="text-[11px] font-semibold text-text-primary flex items-center">
                      <Calendar size={10} className="mr-1 text-text-secondary" />
                      {( project.createdAt ? new Date(project.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "N/A" )}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase shadow-sm ${
                    project.status === 'Completed' ? 'text-success bg-success/10 border border-success/20' : 'text-accent-blue bg-accent-blue/10 border border-accent-blue/20'
                  }`}>
                    {project.status}
                  </span>
                </div>

                {/* Footer: Members & Link */}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border border-dashed">
                  <div>
                    <div className="avatar-stack">
                      {project.members?.slice(0, 4).map(m => (
                        <div key={m._id} title={m.name} className="-ml-2 first:ml-0 hover:z-10 transition-transform">
                          <Avatar user={m} size="w-6 h-6" textClass="text-[9px]" showStatus={false} className="border-2 border-bg-secondary shadow-sm" />
                        </div>
                      ))}
                      {project.members?.length > 4 && (
                        <div className="h-6 w-6 rounded-full bg-bg-primary flex items-center justify-center text-text-secondary text-[9px] font-bold border-2 border-bg-secondary shadow-sm">
                          +{project.members.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Link 
                    to={`/projects/${toSlug(project.title, project._id)}`} 
                    className="text-[11px] font-bold text-accent-blue hover:text-white hover:bg-accent-blue px-2.5 py-1 rounded-md transition-colors border border-accent-blue/20 bg-accent-blue/5"
                  >
                    View Pipeline
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          {filtered.length === 0 && (
            <div className="text-center py-16 text-text-secondary bg-bg-secondary rounded-2xl border border-dashed border-border mt-4">
              <FolderKanban size={48} className="mx-auto mb-4 opacity-20" />
              <h3 className="font-outfit text-xl font-bold text-text-primary mb-2">No Projects Found</h3>
              <p>{user?.role === 'employee' ? 'You haven\'t been assigned to any projects yet.' : 'There are no projects matching your search. Create one!'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Premium CRUD Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-3xl shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">{editItem ? 'Edit Project' : 'Create New Project'}</h3>
                <p className="text-xs text-text-secondary">Organize work into focused projects.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Project Type (Select Multiple)</label>
                  <div className="flex flex-wrap gap-2">
                    {['Software', 'Website', 'SaaS', 'PaaS', 'Digital Marketing', 'SEO'].map(pt => (
                      <label key={pt} className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${formData.projectType.includes(pt) ? 'bg-accent-blue text-accent-text shadow-soft' : 'bg-bg-secondary text-text-secondary border border-border hover:bg-border/50'}`}>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={formData.projectType.includes(pt)} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, projectType: [...formData.projectType, pt]});
                            } else {
                              setFormData({...formData, projectType: formData.projectType.filter(t => t !== pt)});
                            }
                          }}
                        />
                        <span>{pt}</span>
                      </label>
                    ))}
                  </div>
                </div>
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

              {['super_admin', 'hr'].includes(user?.role) && (
                <div className="bg-bg-primary/50 p-5 rounded-2xl border border-border mt-6">
                  <label className="block text-sm font-bold text-text-primary mb-4 font-outfit">Workflow Setup</label>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Project Coordinator</label>
                    <select 
                      value={formData.coordinator} onChange={e => setFormData({...formData, coordinator: e.target.value})}
                      className="premium-input mb-2"
                    >
                      <option value="">-- Select Coordinator --</option>
                      {workspaceMembers
                        .filter(m => (m.user.designation || '').toLowerCase().includes('coordinator'))
                        .map(m => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
                    </select>
                  </div>

                  {(() => {
                    const hasSoftware = formData.projectType.some(t => ['Software', 'Website', 'SaaS', 'PaaS'].includes(t));
                    const stages = [];
                    if (hasSoftware) {
                      stages.push({ key: 'uiux', label: 'UI/UX' });
                      stages.push({ key: 'tech', label: 'Tech' });
                      stages.push({ key: 'test', label: 'Test' });
                      stages.push({ key: 'devops', label: 'DevOps' });
                    }
                    if (formData.projectType.includes('Digital Marketing')) stages.push({ key: 'digitalMarketing', label: 'Digital Marketing' });
                    if (formData.projectType.includes('SEO')) stages.push({ key: 'seo', label: 'SEO' });

                    if (stages.length === 0) return null;

                    return (
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Pipeline Setup (Required)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-2 w-full">
                          {stages.map((stage, idx, arr) => (
                            <div key={stage.key} className="bg-bg-secondary p-3.5 rounded-2xl border border-border shadow-sm relative group hover:border-accent-blue/50 transition-colors">
                              <div className="flex items-center space-x-2.5 mb-3">
                                <div className="w-5 h-5 rounded-full bg-accent-blue text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                  {idx + 1}
                                </div>
                                <label className="text-xs font-bold text-text-primary uppercase tracking-wide">{stage.label}</label>
                              </div>
                              <select 
                                value={formData.workflowTeams[stage.key]} 
                                onChange={e => setFormData({...formData, workflowTeams: {...formData.workflowTeams, [stage.key]: e.target.value}})} 
                                className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2 text-[11px] text-text-primary focus:outline-none focus:border-accent-blue transition-all"
                              >
                                <option value="">-- Assign Team --</option>
                                {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}



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
