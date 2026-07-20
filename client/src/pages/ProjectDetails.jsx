import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Plus, X, ArrowLeft, Users, Calendar, Flag } from 'lucide-react';

const ProjectDetails = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [columns, setColumns] = useState({
    'To Do': { name: 'To Do', color: 'text-slate-400', items: [] },
    'In Progress': { name: 'In Progress', color: 'text-accent-blue', items: [] },
    'Done': { name: 'Done', color: 'text-success', items: [] }
  });
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'Medium', dueDate: '', assignees: [] });
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('taskCreated', (t) => { if (t.project === id) fetchTasks(workspaceId); });
    socket.on('taskUpdated', (t) => { if (t.project === id) fetchTasks(workspaceId); });
    return () => { socket.off('taskCreated'); socket.off('taskUpdated'); };
  }, [socket, id, workspaceId]);

  useEffect(() => {
    if (!id) return;
    initData();
  }, [id]);

  const initData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspaceId(ws._id);
        await fetchTasks(ws._id);

        if (user?.role !== 'employee') {
          const membersRes = await axios.get(`/workspaces/${ws._id}/projects/members`);
          setWorkspaceMembers(membersRes.data);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTasks = async (wsId) => {
    if (!wsId) return;
    try {
      const res = await axios.get(`/workspaces/${wsId}/projects/${id}/tasks`);
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
      try { await axios.put(`/tasks/${removed._id}`, { status: destination.droppableId }); } catch (e) { console.error(e); }
      setColumns({
        ...columns,
        [source.droppableId]: { ...sourceCol, items: sourceItems },
        [destination.droppableId]: { ...destCol, items: destItems }
      });
    } else {
      sourceItems.splice(destination.index, 0, removed);
      setColumns({ ...columns, [source.droppableId]: { ...sourceCol, items: sourceItems } });
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!workspaceId) return;
    try {
      await axios.post(`/workspaces/${workspaceId}/projects/${id}/tasks`, {
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

  return (
    <div className="h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <Link to="/projects" className="text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-wide">Kanban Board</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {user?.role === 'employee' ? 'Your assigned tasks' : 'Drag tasks between columns to update status'}
            </p>
          </div>
        </div>
        {user?.role !== 'employee' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Task</span>
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
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
                      className={`flex-1 rounded-2xl p-3 transition-all min-h-[400px] border ${
                        snapshot.isDraggingOver
                          ? 'bg-accent-blue/5 border-accent-blue/30'
                          : 'bg-bg-secondary border-border'
                      }`}
                    >
                      {column.items.map((item, index) => (
                        <Draggable key={item._id} draggableId={item._id} index={index} isDragDisabled={user?.role === 'employee'}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-4 mb-3 rounded-xl border transition-all ${
                                snapshot.isDragging
                                  ? 'bg-bg-primary border-accent-blue shadow-lg shadow-accent-blue/10 rotate-1'
                                  : 'bg-bg-primary border-border hover:border-accent-blue/50'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColor(item.priority)}`}>
                                  {item.priority}
                                </span>
                              </div>
                              <h3 className="text-sm font-semibold text-text-primary mb-1">{item.title}</h3>
                              {item.description && (
                                <p className="text-xs text-text-secondary line-clamp-2 mb-3">{item.description}</p>
                              )}
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                                <div className="flex -space-x-1.5">
                                  {item.assignees?.map((a) => (
                                    <div key={a._id} title={a.name} className="h-6 w-6 rounded-full bg-accent-blue/20 border-2 border-bg-primary flex items-center justify-center text-[10px] text-accent-blue font-bold">
                                      {a.name?.charAt(0).toUpperCase()}
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
      </div>

      {/* Add Task Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">Create New Task</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Task Title</label>
                <input
                  type="text" required
                  value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Design landing page"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1 flex items-center"><Flag size={12} className="mr-1" /> Priority</label>
                  <select
                    value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1 flex items-center"><Calendar size={12} className="mr-1" /> Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              {/* Assign to employees */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2 flex items-center"><Users size={12} className="mr-1" /> Assign To</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-border rounded-lg p-2 bg-bg-primary">
                  {workspaceMembers.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-2">No team members yet.</p>
                  ) : (
                    workspaceMembers.map(member => (
                      <label key={member.user._id} className="flex items-center space-x-2 p-1.5 hover:bg-bg-secondary rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assignees.includes(member.user._id)}
                          onChange={() => toggleAssignee(member.user._id)}
                          className="accent-accent-blue"
                        />
                        <div className="h-6 w-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-bold">
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
