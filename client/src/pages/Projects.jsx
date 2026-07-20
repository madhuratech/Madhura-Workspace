import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Search, Calendar, Plus, FolderKanban, X, Users, CheckCircle2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Projects = () => {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '', members: [] });
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

        // Get workspace members for assignment (only for super_admin/hr)
        if (user?.role !== 'employee') {
          const membersRes = await axios.get(`/workspaces/${ws._id}/projects/members`);
          setWorkspaceMembers((membersRes.data || []).filter(m => m.user));
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
      setFormData({ title: item.title, description: item.description || '', members: item.members.map(m => m._id) });
    } else {
      setEditItem(null);
      setFormData({ title: '', description: '', members: [] });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspaceId) return;
    try {
      if (editItem) {
        await axios.put(`/workspaces/${workspaceId}/projects/${editItem._id}`, formData);
      } else {
        await axios.post(`/workspaces/${workspaceId}/projects`, formData);
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
                    <td className="text-right space-x-3">
                      <Link to={`/project/${project._id}`} className="text-accent-blue hover:underline text-sm font-medium">Board</Link>
                      <button onClick={() => handleOpenModal(project)} className="text-text-secondary hover:text-text-primary text-sm font-medium">Edit</button>
                      <button onClick={() => handleDelete(project._id)} className="text-danger hover:underline text-sm font-medium">Delete</button>
                    </td>
                  )}
                  {user?.role === 'employee' && (
                    <td className="text-right">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
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
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center">
                  <Users size={14} className="mr-1.5" /> Assign Members
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-bg-primary">
                  {workspaceMembers.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-2">No team members yet. Add some via Team Management.</p>
                  ) : (
                    workspaceMembers.map(member => (
                      <label key={member.user._id} className="flex items-center space-x-3 p-2 hover:bg-bg-secondary rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.members.includes(member.user._id)}
                          onChange={() => toggleMember(member.user._id)}
                          className="accent-accent-blue"
                        />
                        <div className="h-7 w-7 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold">
                          {member.user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{member.user.name}</p>
                          <p className="text-xs text-text-secondary capitalize">{member.role.replace('_', ' ')}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
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
