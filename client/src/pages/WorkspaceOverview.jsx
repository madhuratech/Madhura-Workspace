import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { FolderKanban, Users, CalendarDays, FileText } from 'lucide-react';

const WorkspaceOverview = () => {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const res = await axios.get(`/workspaces/${id}`);
        setWorkspace(res.data);
      } catch (error) {
        console.error('Error fetching workspace:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, [id]);

  if (loading) return <div className="p-8 text-text-secondary">Loading workspace...</div>;
  if (!workspace) return <div className="p-8 text-danger">Workspace not found</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide">{workspace.name} Overview</h1>
          <p className="text-text-secondary mt-1">{workspace.description || 'Welcome to your workspace dashboard'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/projects" className="bg-bg-secondary p-6 rounded-2xl border border-border hover:border-accent-blue transition-all group shadow-sm flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-accent-blue/10 rounded-xl text-accent-blue"><FolderKanban size={32} /></div>
          <h3 className="text-lg font-bold text-text-primary group-hover:text-accent-blue transition-colors">Projects</h3>
        </Link>
        <Link to="/team" className="bg-bg-secondary p-6 rounded-2xl border border-border hover:border-purple-500 transition-all group shadow-sm flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-purple-500/10 rounded-xl text-purple-500"><Users size={32} /></div>
          <h3 className="text-lg font-bold text-text-primary group-hover:text-purple-500 transition-colors">Team & Members</h3>
        </Link>
        <Link to="/meetings" className="bg-bg-secondary p-6 rounded-2xl border border-border hover:border-orange-500 transition-all group shadow-sm flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-orange-500/10 rounded-xl text-orange-500"><CalendarDays size={32} /></div>
          <h3 className="text-lg font-bold text-text-primary group-hover:text-orange-500 transition-colors">Meetings</h3>
        </Link>
        <Link to="/documents" className="bg-bg-secondary p-6 rounded-2xl border border-border hover:border-success transition-all group shadow-sm flex flex-col items-center justify-center space-y-3">
          <div className="p-4 bg-success/10 rounded-xl text-success"><FileText size={32} /></div>
          <h3 className="text-lg font-bold text-text-primary group-hover:text-success transition-colors">Documents</h3>
        </Link>
      </div>
    </div>
  );
};

export default WorkspaceOverview;
