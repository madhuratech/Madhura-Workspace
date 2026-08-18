import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Plus, X, ArrowLeft, Users, Calendar, Flag, Trash2 } from 'lucide-react';
import Avatar from '../components/Avatar';

// Extract the 24-char MongoDB ObjectId that was appended as the last segment of the slug
const idFromSlug = (slug = '') => {
  // Slug format: "project-name-title-XXXXXX" where XXXXXX is the last 6 chars of the _id
  // We need to find the full _id by matching against projects, so we just pass the suffix
  return slug.split('-').pop(); // returns the 6-char suffix for lookup
};

// Kanban skeleton loader
const KanbanSkeleton = () => (
  <div className="h-full flex flex-col font-sans">
    {/* Header skeleton */}
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center space-x-4">
        <div className="h-9 w-9 bg-border rounded-full animate-pulse"></div>
        <div>
          <div className="h-7 w-56 bg-border rounded-xl animate-pulse mb-2"></div>
          <div className="h-3.5 w-40 bg-border/60 rounded animate-pulse"></div>
        </div>
      </div>
      <div className="h-10 w-28 bg-border rounded-xl animate-pulse"></div>
    </div>
    {/* Kanban columns skeleton */}
    <div className="flex gap-5 flex-1 overflow-hidden">
      {['To Do', 'In Progress', 'Done'].map((col) => (
        <div key={col} className="flex flex-col w-72 shrink-0">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center space-x-2">
              <div className="h-2.5 w-2.5 rounded-full bg-border animate-pulse"></div>
              <div className="h-4 w-20 bg-border rounded animate-pulse"></div>
            </div>
            <div className="h-5 w-6 bg-border/60 rounded-full animate-pulse"></div>
          </div>
          <div className="flex-1 rounded-3xl p-4 bg-bg-primary/80 border border-border/60 min-h-[500px]">
            {[1, 2, col === 'To Do' ? 3 : null].filter(Boolean).map((i) => (
              <div key={i} className="p-5 mb-4 rounded-2xl border border-border bg-bg-secondary shadow-sm">
                <div className="flex justify-between items-center mb-3">
                  <div className="h-4 w-14 bg-border/60 rounded animate-pulse"></div>
                  <div className="h-4 w-4 bg-border/40 rounded animate-pulse"></div>
                </div>
                <div className="h-5 w-4/5 bg-border rounded-lg animate-pulse mb-2"></div>
                <div className="h-3 w-full bg-border/50 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-3/4 bg-border/50 rounded animate-pulse mb-5"></div>
                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                  <div className="flex -space-x-2">
                    {[1,2].map(j => <div key={j} className="h-7 w-7 rounded-full bg-border animate-pulse border-2 border-bg-secondary"></div>)}
                  </div>
                  <div className="h-3 w-16 bg-border/50 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProjectDetails = () => {
  const { slug } = useParams();
  // The slug ends with the last 6 chars of the MongoDB _id (e.g. "my-project-fe5b")
  const slugSuffix = idFromSlug(slug);
  const { user } = useContext(AuthContext);
  const [columns, setColumns] = useState({
    'To Do': { name: 'To Do', color: 'text-slate-400', items: [] },
    'In Progress': { name: 'In Progress', color: 'text-accent-blue', items: [] },
    'Done': { name: 'Done', color: 'text-success', items: [] }
  });
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [project, setProject] = useState(null);
  const [projectId, setProjectId] = useState(null); // real MongoDB _id resolved from slug
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', assignees: [] });
  const [socket, setSocket] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(animation);
  }, []);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(API_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('taskCreated', (t) => { if (t.project === projectId) fetchTasks(workspaceId); });
    socket.on('taskUpdated', (t) => { if (t.project === projectId) fetchTasks(workspaceId); });
    return () => { socket.off('taskCreated'); socket.off('taskUpdated'); };
  }, [socket, projectId, workspaceId]);

  useEffect(() => {
    if (!slugSuffix) return;
    initData();
  }, [slug]);

  const initData = async () => {
    try {
      setLoading(true);
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspaceId(ws._id);

        // Fetch all projects to find the one matching our slug suffix
        const allProjRes = await axios.get(`/workspaces/${ws._id}/projects`);
        const matched = (allProjRes.data || []).find(p =>
          String(p._id).endsWith(slugSuffix) ||
          String(p._id).slice(-6) === slugSuffix
        );

        if (!matched) {
          console.error('Project not found for slug:', slug);
          setLoading(false);
          return;
        }

        const resolvedId = matched._id;
        setProjectId(resolvedId);
        setProject(matched);

        let reqs = [
          axios.get(`/workspaces/${ws._id}/projects/${resolvedId}/tasks`).catch(e => ({ error: true, data: e }))
        ];
        if (user?.role !== 'employee') {
          reqs.push(axios.get(`/workspaces/${ws._id}/projects/members`).catch(e => ({ error: true, data: e })));
          reqs.push(axios.get(`/workspaces/${ws._id}/teams`).catch(e => ({ error: true, data: e })));
        }

        const [tasksRes, membersRes, teamsRes] = await Promise.all(reqs);

        if (!tasksRes.error) {
          const cols = {
            'To Do': { name: 'To Do', color: 'text-slate-400', items: [] },
            'In Progress': { name: 'In Progress', color: 'text-accent-blue', items: [] },
            'Done': { name: 'Done', color: 'text-success', items: [] }
          };
          tasksRes.data.forEach(t => {
            if (cols[t.status]) cols[t.status].items.push(t);
          });
          setColumns(cols);
        }

        if (user?.role !== 'employee' && membersRes && !membersRes.error) {
          let members = (membersRes.data || []).filter(m => m.user);
          if (user?.role === 'team_leader' && teamsRes && !teamsRes.error) {
            const tlTeam = teamsRes.data.find(t => String(t.leader?._id || t.leader) === String(user._id));
            if (tlTeam) {
              const teamMemberIds = tlTeam.members.map(m => String(m._id || m));
              members = members.filter(m => teamMemberIds.includes(String(m.user._id)) || String(m.user._id) === String(user._id));
            }
          }
          setWorkspaceMembers(members);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStage = async () => {
    try {
      const res = await axios.put(`/workspaces/${workspaceId}/projects/${projectId}/advance`);
      setProject(res.data);
      alert('Project stage advanced successfully!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to advance stage');
    }
  };

  const fetchTasks = async (wsId, pid) => {
    const resolvedId = pid || projectId;
    if (!wsId || !resolvedId) return;
    try {
      const res = await axios.get(`/workspaces/${wsId}/projects/${resolvedId}/tasks`);
      const cols = {
        'To Do': { name: 'To Do', color: 'text-slate-400', items: [] },
        'In Progress': { name: 'In Progress', color: 'text-accent-blue', items: [] },
        'Done': { name: 'Done', color: 'text-success', items: [] }
      };
      res.data.forEach(task => {
        if (cols[task.status]) cols[task.status].items.push(task);
      });
      setColumns(cols);
    } catch (error) {
      console.error(error);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = columns[source.droppableId];
    const destCol = columns[destination.droppableId];
    const sourceItems = [...sourceCol.items];
    const destItems = source.droppableId === destination.droppableId ? sourceItems : [...destCol.items];
    const [removed] = sourceItems.splice(source.index, 1);

    if (source.droppableId !== destination.droppableId) {
      destItems.splice(destination.index, 0, { ...removed, status: destination.droppableId });
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, items: sourceItems },
        [destination.droppableId]: { ...destCol, items: destItems }
      });
      try { await axios.put(`/tasks/${removed._id}`, { status: destination.droppableId }); } catch (e) { console.error(e); }
    } else {
      sourceItems.splice(destination.index, 0, removed);
      setColumns({ ...columns, [source.droppableId]: { ...sourceCol, items: sourceItems } });
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!workspaceId || !projectId) return;
    try {
      await axios.post(`/workspaces/${workspaceId}/projects/${projectId}/tasks`, {
        ...formData,
        workspace: workspaceId,
        assignees: formData.assignees.length > 0 ? formData.assignees : undefined
      });
      setIsModalOpen(false);
      setFormData({ title: '', description: '', priority: 'Medium', dueDate: '', assignees: [] });
      fetchTasks(workspaceId);
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await axios.delete(`/tasks/${taskId}`);
      fetchTasks(workspaceId);
    } catch (error) {
      console.error(error);
      alert('Error deleting task');
    }
  };

  const toggleAssignee = (userId) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(userId)
        ? prev.assignees.filter(id => id !== userId)
        : [...prev.assignees, userId]
    }));
  };

  const priorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'Low': return 'text-green-400 bg-green-400/10 border-green-400/30';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  const colHeaderColor = {
    'To Do': 'bg-slate-500',
    'In Progress': 'bg-accent-blue',
    'Done': 'bg-success',
  };

  if (loading) return <KanbanSkeleton />;

  return (
    <div className="h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-4">
          <Link to="/projects" className="bg-bg-secondary p-2 rounded-full border border-border shadow-sm text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 transition-all">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-wide font-outfit flex items-center">
              {project ? project.title : 'Project'} 
              <span className="text-text-secondary font-medium text-lg ml-3 pl-3 border-l-2 border-border">Kanban Board</span>
            </h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-text-secondary text-sm">Stage:</span>
              {['UI/UX', 'Tech', 'Test', 'DevOps', 'Completed'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${project?.stage === s ? 'bg-accent-blue text-white' : 'bg-bg-secondary text-text-secondary border border-border'}`}>
                    {s}
                  </span>
                  {i < 4 && <span className="text-border mx-1">-</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {project?.stage !== 'Completed' && (['super_admin', 'hr', 'team_leader'].includes(user?.role) || String(project?.coordinator?._id || project?.coordinator) === String(user?._id)) && (
            <button
              onClick={handleAdvanceStage}
              className="bg-success/10 text-success border border-success/30 px-4 py-2 rounded-xl hover:bg-success hover:text-white shadow-soft transition-all text-sm font-semibold flex items-center space-x-2"
            >
              <Flag size={16} />
              <span>Mark Stage Complete</span>
            </button>
          )}
          {user?.role !== 'employee' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-accent-blue text-accent-text px-5 py-2.5 rounded-xl hover:bg-accent-indigo shadow-soft hover:shadow-hover transition-all text-sm font-semibold flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        {isReady && (
          <div className="flex gap-5 h-full min-w-max">
            <DragDropContext onDragEnd={onDragEnd}>
              {Object.entries(columns).map(([columnId, column]) => (
              <div className="flex flex-col w-72 shrink-0" key={columnId}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center space-x-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${colHeaderColor[columnId]}`}></div>
                    <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">{column.name}</h2>
                  </div>
                  <span className="bg-bg-secondary border border-border text-text-secondary text-xs px-2 py-0.5 rounded-full font-medium">
                    {column.items.length}
                  </span>
                </div>

                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 rounded-3xl p-4 transition-all min-h-[500px] border ${
                        snapshot.isDraggingOver
                          ? 'bg-accent-blue/5 border-accent-blue/30 shadow-inner'
                          : 'bg-bg-primary/80 border-border/60'
                      }`}
                    >
                      {column.items.map((item, index) => (
                        <Draggable key={item._id} draggableId={String(item._id)} index={index} isDragDisabled={user?.role === 'employee' && (!item.assignees || !item.assignees.some(a => a._id === user._id))}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={provided.draggableProps.style}
                              className={`p-5 mb-4 rounded-2xl border ${
                                snapshot.isDragging
                                  ? 'bg-bg-secondary border-accent-blue shadow-2xl z-50 opacity-90'
                                  : 'bg-bg-secondary border-border shadow-sm hover:shadow-hover hover:border-accent-blue/30 transition-colors'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                                {user?.role !== 'employee' && (
                                  <button onClick={() => handleDeleteTask(item._id)} className="text-text-secondary hover:text-danger transition-colors p-1 rounded-full hover:bg-danger/10">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-text-primary mb-1.5 font-outfit leading-tight">{item.title}</h3>
                              {item.description && (
                                <p className="text-xs text-text-secondary line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                              )}
                              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/50">
                                <div className="avatar-stack">
                                  {item.assignees?.map((a) => (
                                    <div key={a._id} title={a.name} className="-ml-2 first:ml-0 hover:z-10 transition-transform">
                                      <Avatar user={a} size="w-7 h-7" textClass="text-[10px]" showStatus={false} className="border-2 border-bg-secondary shadow-sm" />
                                    </div>
                                  ))}
                                </div>
                                {item.dueDate && (
                                  <span className="text-[10px] text-text-secondary flex items-center">
                                    <Calendar size={10} className="mr-1" />
                                    {new Date(item.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {column.items.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-text-secondary opacity-50">
                          <p className="text-xs">Drop tasks here</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </DragDropContext>
        </div>
        )}
      </div>

      {/* Premium Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-lg shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1">Create New Task</h3>
                <p className="text-xs text-text-secondary">Add actionable items to your project.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Task Title</label>
                <input
                  type="text" required
                  value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="premium-input"
                  placeholder="e.g. Design landing page"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide">Description</label>
                <textarea
                  rows={2}
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="premium-input resize-none"
                  placeholder="What needs to be done?"
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide flex items-center"><Flag size={12} className="mr-1" /> Priority</label>
                  <select
                    value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="premium-input"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary mb-2 uppercase tracking-wide flex items-center"><Calendar size={12} className="mr-1" /> Due Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="premium-input"
                  />
                </div>
              </div>

              {/* Assign to employees */}
              <div className="bg-bg-primary/50 p-5 rounded-2xl border border-border mt-4">
                <label className="block text-xs font-bold text-text-secondary mb-3 uppercase tracking-wide flex items-center"><Users size={12} className="mr-1" /> Assign Members</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-border rounded-xl p-2 bg-bg-secondary custom-scrollbar">
                  {workspaceMembers.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-4">No team members yet.</p>
                  ) : (
                    workspaceMembers.map(member => (
                      <label key={member.user._id} className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.assignees.includes(member.user._id) ? 'bg-accent-blue/10 border border-accent-blue/20' : 'hover:bg-bg-primary border border-transparent'}`}>
                        <div className="relative flex items-center justify-center">
                          <Avatar user={member.user} size="w-8 h-8" textClass="text-xs" showStatus={false} />
                          {formData.assignees.includes(member.user._id) && <div className="absolute -bottom-1 -right-1 bg-success h-3.5 w-3.5 rounded-full border-2 border-bg-secondary"></div>}
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className={`text-sm font-semibold ${formData.assignees.includes(member.user._id) ? 'text-accent-blue' : 'text-text-primary'}`}>{member.user.name}</span>
                          <span className="text-[10px] text-text-secondary uppercase tracking-wider">{member.role.replace('_', ' ')}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.assignees.includes(member.user._id)}
                          onChange={() => toggleAssignee(member.user._id)}
                          className="hidden"
                        />
                      </label>
                    ))
                  )}
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
                  Create Task
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

export default ProjectDetails;
