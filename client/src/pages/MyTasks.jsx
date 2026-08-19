import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Flag, CheckCircle2, LayoutList, KanbanSquare, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';

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
      case 'High': return 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]';
      case 'Low': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const colHeaderConfig = {
    'To Do': { bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/30', glow: 'shadow-[0_0_15px_rgba(100,116,139,0.15)]' },
    'In Progress': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]' },
    'Done': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
  };

  return (
    <div className="h-full flex flex-col font-sans p-6 md:p-8 bg-bg-primary overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide font-outfit">My Tasks</h1>
          <p className="text-text-secondary text-sm mt-1">Manage your daily assigned tasks across all projects</p>
        </div>
        <div className="flex bg-bg-secondary rounded-xl p-1.5 border border-border shadow-soft">
          <button 
            onClick={() => setViewMode('list')} 
            className={`flex items-center space-x-2 px-5 py-2 rounded-lg transition-all text-sm font-semibold ${viewMode === 'list' ? 'bg-bg-primary text-accent-blue shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <LayoutList size={16} /> <span>List</span>
          </button>
          <button 
            onClick={() => setViewMode('kanban')} 
            className={`flex items-center space-x-2 px-5 py-2 rounded-lg transition-all text-sm font-semibold ${viewMode === 'kanban' ? 'bg-bg-primary text-accent-blue shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'}`}
          >
            <KanbanSquare size={16} /> <span>Board</span>
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
          <div className="overflow-x-auto flex-1">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">DONE</th>
                  <th className="text-left">TASK NAME</th>
                  <th className="text-left w-48">PROJECT</th>
                  <th className="text-left w-32">DUE DATE</th>
                  <th className="text-left w-32">PRIORITY</th>
                  <th className="text-left w-32">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id} className={task.status === 'Done' ? 'opacity-60' : ''}>
                    <td className="text-center">
                      <button 
                        onClick={() => updateTaskStatus(task._id, task.status === 'Done' ? 'To Do' : 'Done')}
                        className={`p-1 rounded-full transition-colors ${task.status === 'Done' ? 'text-success bg-success/20' : 'text-text-secondary border border-text-secondary/50 hover:border-success hover:text-success'}`}
                      >
                        <Check size={16} className={task.status !== 'Done' ? 'opacity-0 hover:opacity-100 transition-opacity' : ''} />
                      </button>
                    </td>
                    <td className="font-medium text-text-primary">
                      <p className={task.status === 'Done' ? 'line-through text-text-secondary' : ''}>{task.title}</p>
                    </td>
                    <td>
                      <Link to={`/projects/${task.project?._id}`} className="text-accent-blue hover:underline text-sm font-medium">
                        {task.project?.title || 'Unknown Project'}
                      </Link>
                    </td>
                    <td className="text-text-secondary text-sm flex items-center">
                      <Calendar size={14} className="mr-2 opacity-70" />
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                       <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task._id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded focus:outline-none appearance-none cursor-pointer ${
                          task.status === 'Done' ? 'bg-success/10 text-success' : 
                          task.status === 'In Progress' ? 'bg-accent-blue/10 text-accent-blue' : 'bg-slate-500/10 text-slate-500'
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
        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-4 h-full min-w-max px-1">
            <DragDropContext onDragEnd={onDragEnd}>
              {Object.entries(columns).map(([columnId, column]) => (
                <div className="flex flex-col w-[280px] shrink-0" key={columnId}>
                  {/* Column Header */}
                  <div className={`flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl border bg-bg-secondary/60 backdrop-blur-md ${colHeaderConfig[columnId]?.border} ${colHeaderConfig[columnId]?.glow}`}>
                    <div className="flex items-center space-x-2.5">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${colHeaderConfig[columnId]?.bg}`}>
                        {columnId === 'To Do' && <KanbanSquare size={14} className={colHeaderConfig[columnId]?.text} />}
                        {columnId === 'In Progress' && <Flag size={14} className={colHeaderConfig[columnId]?.text} />}
                        {columnId === 'Done' && <CheckCircle2 size={14} className={colHeaderConfig[columnId]?.text} />}
                      </div>
                      <h2 className="text-[13px] font-bold text-text-primary tracking-wide">{column.name}</h2>
                    </div>
                    <span className="bg-bg-primary shadow-sm border border-border text-text-secondary text-xs px-2 py-0.5 rounded-full font-bold">
                      {column.items.length}
                    </span>
                  </div>

                  {/* Droppable Area */}
                  <Droppable droppableId={columnId}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 rounded-2xl p-2 transition-all duration-300 min-h-[400px] border-2 ${
                          snapshot.isDraggingOver
                            ? `bg-bg-secondary/40 border-dashed ${colHeaderConfig[columnId]?.border}`
                            : 'bg-bg-primary/20 border-transparent hover:bg-bg-primary/40'
                        }`}
                      >
                        {column.items.map((item, index) => (
                          <Draggable key={item._id} draggableId={String(item._id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`group relative p-3.5 mb-3 rounded-xl border backdrop-blur-sm ${
                                  snapshot.isDragging
                                    ? `bg-bg-secondary border-accent-blue shadow-[0_10px_25px_rgba(0,0,0,0.15)] z-50`
                                    : 'bg-bg-secondary border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-accent-blue/40 transition-all duration-300'
                                }`}
                              >
                                {/* Decorative line */}
                                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${colHeaderConfig[item.status]?.bg.replace('/10', '')}`} />

                                <div className="flex justify-between items-start mb-2.5">
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${priorityColor(item.priority)}`}>
                                    {item.priority}
                                  </span>
                                  <Link to={`/projects/${item.project?._id}`} className="text-[10px] text-text-secondary hover:text-accent-blue bg-bg-primary px-1.5 py-0.5 rounded transition-colors font-medium border border-border/50">
                                    {item.project?.title || 'Unknown'}
                                  </Link>
                                </div>
                                <h3 className={`text-[13px] font-bold mb-1.5 font-outfit leading-tight ${item.status === 'Done' ? 'text-text-secondary line-through' : 'text-text-primary group-hover:text-accent-blue transition-colors'}`}>
                                  {item.title}
                                </h3>
                                {item.description && (
                                  <p className="text-[11px] text-text-secondary line-clamp-2 mb-3 leading-relaxed opacity-80">
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40">
                                  <div className="avatar-stack flex">
                                    {item.assignees?.map((a) => (
                                      <div key={a._id} title={a.name} className="-ml-1.5 first:ml-0 hover:z-10 hover:-translate-y-1 transition-all duration-200">
                                        <Avatar user={a} size="w-6 h-6" textClass="text-[9px]" showStatus={false} className="border-2 border-bg-secondary shadow-sm" />
                                      </div>
                                    ))}
                                  </div>
                                  {item.dueDate && (
                                    <div className="flex items-center space-x-1 bg-bg-primary/50 px-1.5 py-0.5 rounded-md border border-border/50">
                                      <Calendar size={10} className="text-text-secondary" />
                                      <span className="text-[10px] font-medium text-text-secondary">
                                        {new Date(item.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {column.items.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-24 text-text-secondary/50 border-2 border-dashed border-border/30 rounded-xl m-1">
                            <LayoutList size={24} className="mb-1 opacity-40" />
                            <p className="text-[11px] font-medium">Drop tasks here</p>
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
