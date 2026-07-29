import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Flag, CheckCircle2, LayoutList, KanbanSquare, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const MyTasks = () => {
  const { user } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [columns, setColumns] = useState({
    'To Do': { name: 'To Do', items: [] },
    'In Progress': { name: 'In Progress', items: [] },
    'Done': { name: 'Done', items: [] }
  });
  const [workspaceId, setWorkspaceId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const newSocket = io(API_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleTaskUpdate = () => { if (workspaceId) fetchMyTasks(workspaceId); };
    socket.on('taskCreated', handleTaskUpdate);
    socket.on('taskUpdated', handleTaskUpdate);
    return () => { socket.off('taskCreated'); socket.off('taskUpdated'); };
  }, [socket, workspaceId]);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        setWorkspaceId(wsRes.data[0]._id);
        fetchMyTasks(wsRes.data[0]._id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyTasks = async (wsId) => {
    if (!wsId) return;
    try {
      const res = await axios.get(`/workspaces/${wsId}/my-tasks`);
      setTasks(res.data);
      
      const cols = {
        'To Do': { name: 'To Do', items: [] },
        'In Progress': { name: 'In Progress', items: [] },
        'Done': { name: 'Done', items: [] }
      };
      res.data.forEach(task => {
        if (cols[task.status]) cols[task.status].items.push(task);
      });
      setColumns(cols);
    } catch (error) {
      console.error(error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus, skipColumnUpdate = false) => {
    // Optimistic UI Update: update tasks array for List view
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));

    if (!skipColumnUpdate) {
      // Optimistic UI Update: update columns for Kanban view
      setColumns(prev => {
        let taskToMove = null;
        const newCols = { ...prev };
        Object.keys(newCols).forEach(key => {
          const itemIdx = newCols[key].items.findIndex(t => t._id === taskId);
          if (itemIdx > -1) {
            taskToMove = newCols[key].items[itemIdx];
            newCols[key] = { ...newCols[key], items: newCols[key].items.filter(t => t._id !== taskId) };
          }
        });
        if (taskToMove && newCols[newStatus]) {
          newCols[newStatus].items.push({ ...taskToMove, status: newStatus });
        }
        return newCols;
      });
    }

    try {
      await axios.put(`/tasks/${taskId}`, { status: newStatus });
      // We don't fetchMyTasks here immediately to prevent flickering, 
      // the socket will handle real-time sync if needed.
    } catch (e) {
      console.error('Error updating task status', e);
      // Revert on error
      if (workspaceId) fetchMyTasks(workspaceId);
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
      updateTaskStatus(removed._id, destination.droppableId, true);
    } else {
      sourceItems.splice(destination.index, 0, removed);
      setColumns({ ...columns, [source.droppableId]: { ...sourceCol, items: sourceItems } });
    }
  };

  const priorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'Low': return 'text-green-400 bg-green-400/10 border-green-400/30';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
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
      <div className="relative mb-8 p-6 rounded-3xl overflow-hidden bg-gradient-to-r from-bg-secondary to-bg-primary border border-border/50 shadow-[0_0_40px_rgba(0,0,0,0.03)] z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent-blue/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="flex justify-between items-center relative z-20">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary tracking-tight font-outfit">My Tasks</h1>
            <p className="text-text-secondary text-sm mt-1.5 font-medium">Manage your daily assigned tasks across all projects</p>
          </div>
          <div className="flex bg-bg-secondary/80 backdrop-blur-md rounded-2xl p-1.5 border border-border/50 shadow-sm">
            <button 
              onClick={() => setViewMode('list')} 
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all duration-300 text-sm font-bold ${viewMode === 'list' ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'}`}
            >
              <LayoutList size={18} /> <span>List</span>
            </button>
            <button 
              onClick={() => setViewMode('kanban')} 
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all duration-300 text-sm font-bold ${viewMode === 'kanban' ? 'bg-gradient-to-r from-accent-blue to-blue-600 text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'}`}
            >
              <KanbanSquare size={18} /> <span>Board</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-bg-secondary/60 backdrop-blur-xl border border-border/50 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-[0_5px_30px_rgba(0,0,0,0.05)] p-2">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-text-secondary uppercase bg-bg-primary/30 sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="w-16 text-center px-4 py-4 font-bold tracking-widest rounded-tl-xl">DONE</th>
                  <th className="px-6 py-4 font-bold tracking-widest">TASK NAME</th>
                  <th className="px-6 py-4 font-bold tracking-widest w-48">PROJECT</th>
                  <th className="px-6 py-4 font-bold tracking-widest w-32">DUE DATE</th>
                  <th className="px-6 py-4 font-bold tracking-widest w-32">PRIORITY</th>
                  <th className="px-6 py-4 font-bold tracking-widest w-32 rounded-tr-xl">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id} className={`border-b border-border/30 transition-all duration-300 group hover:bg-bg-primary/50 ${task.status === 'Done' ? 'opacity-60' : ''}`}>
                    <td className="text-center px-4 py-4">
                      <button 
                        onClick={() => updateTaskStatus(task._id, task.status === 'Done' ? 'To Do' : 'Done')}
                        className={`p-1.5 rounded-full transition-all transform hover:scale-110 ${task.status === 'Done' ? 'text-white bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-text-secondary border-2 border-border/80 hover:border-emerald-500 hover:text-emerald-500'}`}
                      >
                        <Check size={16} strokeWidth={3} className={task.status !== 'Done' ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''} />
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary">
                      <p className={`text-base ${task.status === 'Done' ? 'line-through text-text-secondary' : ''}`}>{task.title}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/project/${task.project?._id}`} className="text-accent-blue hover:text-blue-600 hover:underline text-sm font-bold transition-colors">
                        {task.project?.title || 'Unknown Project'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-text-secondary text-sm font-semibold flex items-center mt-1">
                      <Calendar size={16} className="mr-2 text-text-secondary/60" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-sm border ${priorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none appearance-none cursor-pointer shadow-sm transition-colors ${
                          task.status === 'Done' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                          task.status === 'In Progress' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Done">Done</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-text-secondary">
                      <CheckCircle2 size={36} className="mx-auto mb-3 opacity-20" />
                      <p>You have no assigned tasks. Enjoy your day!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max">
            <DragDropContext onDragEnd={onDragEnd}>
              {Object.entries(columns).map(([columnId, column]) => (
                <div className="flex flex-col w-[340px] shrink-0" key={columnId}>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center space-x-3">
                      <div className={`h-3 w-3 rounded-full shadow-[0_0_10px_currentColor] ${colHeaderColor[columnId]}`}></div>
                      <h2 className="text-sm font-extrabold text-text-primary uppercase tracking-widest">{column.name}</h2>
                    </div>
                    <span className="bg-bg-primary/80 backdrop-blur border border-border/50 text-text-secondary text-xs px-2.5 py-1 rounded-full font-bold shadow-sm">
                      {column.items.length}
                    </span>
                  </div>

                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 rounded-3xl p-4 transition-all duration-300 min-h-[500px] border ${
                          snapshot.isDraggingOver
                            ? 'bg-accent-blue/5 border-accent-blue/40 shadow-[inset_0_0_30px_rgba(59,130,246,0.1)]'
                            : 'bg-bg-secondary/40 border-border/40 backdrop-blur-md shadow-[0_5px_20px_rgba(0,0,0,0.02)]'
                        }`}
                      >
                        {column.items.map((item, index) => (
                          <Draggable key={item._id} draggableId={item._id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-5 mb-4 rounded-2xl border transition-all duration-300 group ${
                                  snapshot.isDragging
                                    ? 'bg-bg-primary border-accent-blue shadow-[0_20px_40px_rgba(59,130,246,0.2)] z-50 scale-105 rotate-1'
                                    : 'bg-bg-primary/90 backdrop-blur border-border/50 shadow-sm hover:shadow-xl hover:border-accent-blue/40 hover:-translate-y-1'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${priorityColor(item.priority)}`}>
                                    {item.priority}
                                  </span>
                                  <Link to={`/project/${item.project?._id}`} className="text-xs text-accent-blue hover:text-blue-600 hover:underline font-bold transition-colors">
                                    {item.project?.title}
                                  </Link>
                                </div>
                                <h3 className={`text-base font-bold mb-2 font-outfit leading-snug ${item.status === 'Done' ? 'text-text-secondary line-through' : 'text-text-primary'}`}>{item.title}</h3>
                                {item.description && (
                                  <p className="text-[13px] text-text-secondary font-medium line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                                )}
                                <div className="flex justify-between items-center mt-5 pt-4 border-t border-border/50">
                                  <div className="avatar-stack flex -space-x-2">
                                    {item.assignees?.map((a) => (
                                      <div key={a._id} title={a.name} className="h-8 w-8 rounded-full bg-gradient-to-br from-accent-blue to-purple-500 flex items-center justify-center text-[11px] text-white font-bold shadow-md border-2 border-bg-primary relative z-10 hover:z-20 hover:scale-110 transition-transform">
                                        {a.name?.charAt(0).toUpperCase()}
                                      </div>
                                    ))}
                                  </div>
                                  {item.dueDate && (
                                    <span className="text-[11px] font-bold text-text-secondary flex items-center bg-bg-secondary px-2 py-1 rounded-lg">
                                      <Calendar size={12} className="mr-1.5" />
                                      {new Date(item.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
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
      )}
    </div>
  );
};

export default MyTasks;
