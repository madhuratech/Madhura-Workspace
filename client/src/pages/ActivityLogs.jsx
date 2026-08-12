import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import AnimatedLoader from '../components/AnimatedLoader';
import { Activity, Search, Filter, Clock, User, FileText, CheckCircle, Plus, Edit, Trash, LayoutDashboard, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const ActivityLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [workspaceId, setWorkspaceId] = useState(null);
  
  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    // Initial fetch to get workspace ID
    const fetchWorkspace = async () => {
      try {
        const res = await axios.get('/workspaces');
        if (res.data && res.data.length > 0) {
          setWorkspaceId(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch workspace', err);
      }
    };
    fetchWorkspace();
  }, []);

  useEffect(() => {
    if (workspaceId) {
      fetchLogs();
    }
  }, [workspaceId, page, actionFilter, dateFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/workspaces/${workspaceId}/audit-logs?page=${page}&limit=50`;
      if (actionFilter) url += `&action=${actionFilter}`;
      if (dateFilter) {
        const d = new Date(dateFilter);
        url += `&startDate=${d.toISOString()}`;
        d.setDate(d.getDate() + 1);
        url += `&endDate=${d.toISOString()}`;
      }

      const res = await axios.get(url);
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action, entityType) => {
    if (action.includes('LOGIN')) return <User className="text-accent-blue" size={18} />;
    if (action.includes('CREATE')) return <Plus className="text-success" size={18} />;
    if (action.includes('UPDATE')) return <Edit className="text-warning" size={18} />;
    if (action.includes('DELETE')) return <Trash className="text-danger" size={18} />;
    if (entityType === 'Task') return <CheckCircle className="text-accent-blue" size={18} />;
    if (entityType === 'Project') return <LayoutDashboard className="text-accent-purple" size={18} />;
    if (entityType === 'Meeting') return <Calendar className="text-accent-pink" size={18} />;
    return <Activity className="text-text-secondary" size={18} />;
  };

  if (user?.role !== 'super_admin' && user?.role !== 'hr') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Activity size={48} className="text-text-secondary opacity-50 mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Access Denied</h2>
        <p className="text-text-secondary">Only MDs and HR can view the Activity Logs.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Activity className="text-accent-blue" />
            Activity & Audit Logs
          </h1>
          <p className="text-text-secondary text-sm mt-1">Track all activities, logins, and changes across the workspace.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <select 
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue outline-none appearance-none"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">Logins</option>
              <option value="CREATE_TASK">Task Creation</option>
              <option value="UPDATE_TASK">Task Updates</option>
              <option value="CREATE_PROJECT">Project Creation</option>
              <option value="UPDATE_PROJECT">Project Updates</option>
            </select>
          </div>
          
          <div className="relative">
            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:border-accent-blue focus:ring-1 focus:ring-accent-blue outline-none"
            />
          </div>
          
          <button 
            onClick={fetchLogs}
            className="p-2.5 bg-bg-secondary border border-border rounded-lg text-text-primary hover:bg-bg-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-accent-blue' : ''} />
          </button>
        </div>
      </div>

      {/* Logs Table / Timeline */}
      <div className="flex-1 overflow-hidden bg-bg-secondary/50 border border-border rounded-2xl flex flex-col shadow-sm">
        <div className="overflow-auto custom-scrollbar flex-1 p-4">
          {loading && logs.length === 0 ? (
            <AnimatedLoader />
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-text-secondary">
              <FileText size={32} className="opacity-50 mb-3" />
              <p>No activity logs found matching the filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="flex gap-4 p-4 rounded-xl bg-bg-primary/50 hover:bg-bg-primary border border-transparent hover:border-border transition-all">
                  <div className="shrink-0 mt-1">
                    <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center border border-border">
                      {getActionIcon(log.action, log.entityType)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm text-text-primary font-medium">
                          {log.details}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
                          <span className="flex items-center gap-1 bg-bg-secondary px-2 py-0.5 rounded-md border border-border font-medium">
                            {log.user ? log.user.name : 'Unknown User'}
                          </span>
                          <span>•</span>
                          <span className="uppercase text-[10px] tracking-wider font-bold opacity-70">
                            {log.action}
                          </span>
                          {log.entityType && (
                            <>
                              <span>•</span>
                              <span>{log.entityType}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded-md border border-border whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-bg-secondary/30 shrink-0">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary disabled:opacity-50 hover:bg-white/5 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-text-secondary font-medium">
              Page {page} of {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-1.5 bg-bg-primary border border-border rounded-lg text-sm text-text-primary disabled:opacity-50 hover:bg-white/5 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;
