import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Plus, Briefcase, CheckCircle2, Users, CalendarDays, Activity } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await axios.get('/workspaces');
      setWorkspaces(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const createWorkspace = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/workspaces', { name: newWorkspaceName });
      setNewWorkspaceName('');
      setShowModal(false);
      fetchWorkspaces();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="text-text-primary h-full overflow-y-auto pr-2 pb-10 custom-scrollbar font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-2xl font-bold tracking-wide">Welcome, {user?.name?.split(' ')[0]}! 👋</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              user?.role === 'super_admin' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
              user?.role === 'hr' ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20' :
              user?.role === 'team_leader' ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20' :
              'bg-success/10 text-success border border-success/20'
            }`}>
              {user?.role?.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-text-secondary mt-1">
            {user?.role === 'super_admin' && 'Manage your organization, teams, and workspaces.'}
            {user?.role === 'hr' && 'Overview of all projects, meetings, and team activities.'}
            {user?.role === 'team_leader' && 'Assign tasks, track progress, and lead your team.'}
            {user?.role === 'employee' && "Here's what's assigned to you today."}
          </p>
        </div>
        {user?.role === 'super_admin' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>New Workspace</span>
          </button>
        )}
      </div>

      {workspaces.length === 0 ? (
        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold text-text-primary mb-4">
            {user?.role === 'super_admin' ? 'Welcome to MadhuraWS!' : 'You are not in a workspace yet'}
          </h2>
          <p className="text-text-secondary mb-8">
            {user?.role === 'super_admin'
              ? 'Get started by creating your first workspace.'
              : 'Ask your Super Admin to add you to a workspace.'}
          </p>
          {user?.role === 'super_admin' && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent-blue text-white px-6 py-3 rounded-xl hover:bg-blue-600 font-semibold transition-all shadow-md inline-flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map(ws => (
            <div key={ws._id} className="bg-bg-secondary p-6 rounded-2xl border border-border hover:border-accent-blue transition-all group shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-text-primary group-hover:text-accent-blue transition-colors">
                  {ws.name}
                </h3>
                <span className="text-xs font-medium px-2 py-1 bg-accent-blue/10 text-accent-blue rounded">
                  {ws.members?.length || 1} member(s)
                </span>
              </div>
              <p className="text-sm text-text-secondary mb-6">
                No description provided.
              </p>
              
              <div className="flex -space-x-2 mb-6">
                <div className="h-8 w-8 rounded-full bg-accent-blue flex items-center justify-center text-white text-xs font-bold border-2 border-bg-secondary shadow-sm">
                  A
                </div>
              </div>
              
              <button 
                onClick={() => window.location.href = `/workspace/${ws._id}`}
                className="w-full py-2.5 bg-bg-primary text-text-primary font-medium rounded-lg hover:bg-accent-blue hover:text-white transition-colors border border-border hover:border-accent-blue"
              >
                Open Workspace
              </button>
            </div>
          ))}
          
          <button 
            onClick={() => setShowModal(true)}
            className="bg-bg-primary border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center text-text-secondary hover:text-accent-blue hover:border-accent-blue hover:bg-accent-blue/5 transition-all p-6 shadow-sm min-h-[200px]"
          >
            <Plus size={32} className="mb-2" />
            <span className="font-medium">Create New Workspace</span>
          </button>
        </div>
      )}

      {/* UPGRADED DASHBOARD SECTIONS */}
      {workspaces.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-8">
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-accent-blue/10 rounded-xl text-accent-blue"><Briefcase size={28} /></div>
              <div><p className="text-sm text-text-secondary">Total Projects</p><p className="text-2xl font-bold text-text-primary">12</p></div>
            </div>
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-success/10 rounded-xl text-success"><CheckCircle2 size={28} /></div>
              <div><p className="text-sm text-text-secondary">Active Tasks</p><p className="text-2xl font-bold text-text-primary">48</p></div>
            </div>
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-purple-500/10 rounded-xl text-purple-500"><Users size={28} /></div>
              <div><p className="text-sm text-text-secondary">Team Members</p><p className="text-2xl font-bold text-text-primary">8</p></div>
            </div>
            <div className="bg-bg-secondary p-6 rounded-2xl border border-border flex items-center space-x-4 shadow-sm">
              <div className="p-4 bg-orange-500/10 rounded-xl text-orange-500"><CalendarDays size={28} /></div>
              <div><p className="text-sm text-text-secondary">Upcoming Meetings</p><p className="text-2xl font-bold text-text-primary">3</p></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center"><Activity className="mr-2 text-accent-blue" size={20}/> Recent Activity</h3>
              <div className="space-y-4">
                {[1,2,3].map((i) => (
                  <div key={i} className="flex items-start space-x-4 p-3 hover:bg-bg-primary rounded-xl transition-colors">
                    <div className="h-10 w-10 rounded-full bg-accent-blue/20 flex items-center justify-center font-bold text-sm text-accent-blue shrink-0">A</div>
                    <div>
                      <p className="text-sm text-text-secondary"><span className="font-semibold text-text-primary">Alex Johnson</span> moved task <span className="text-accent-blue">"Update UI Components"</span> to In Progress.</p>
                      <span className="text-xs text-text-secondary opacity-80">2 hours ago</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-bg-secondary p-6 rounded-2xl border border-border shadow-sm">
              <h3 className="text-xl font-bold text-text-primary mb-6 flex items-center"><CalendarDays className="mr-2 text-accent-blue" size={20}/> Upcoming</h3>
              <div className="space-y-4">
                <div className="p-4 bg-bg-primary rounded-xl border border-border border-l-4 border-l-accent-blue">
                  <h4 className="font-semibold text-text-primary">Project Sync</h4>
                  <p className="text-sm text-text-secondary mt-1">Today, 2:00 PM</p>
                </div>
                <div className="p-4 bg-bg-primary rounded-xl border border-border border-l-4 border-l-purple-500">
                  <h4 className="font-semibold text-text-primary">Design Review</h4>
                  <p className="text-sm text-text-secondary mt-1">Tomorrow, 10:00 AM</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal for creating workspace */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-text-primary mb-4">Create Workspace</h3>
            <form onSubmit={createWorkspace}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">Workspace Name</label>
                <input 
                  type="text" 
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
