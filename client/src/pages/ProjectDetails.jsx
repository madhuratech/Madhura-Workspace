import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import { Plus, X, ArrowLeft, Users, Calendar, Flag, Trash2, Check, Paperclip, Download } from 'lucide-react';
import Avatar from '../components/Avatar';

// Extract the 24-char MongoDB ObjectId that was appended as the last segment of the slug
const idFromSlug = (slug = '') => {
  return slug.split('-').pop(); 
};

// Valid stages logic
const getValidStages = (project) => {
  const stages = ['Proposal'];
  const keys = [
    { key: 'uiux', label: 'Team 1' },
    { key: 'tech', label: 'Team 2' },
    { key: 'test', label: 'Team 3' },
    { key: 'devops', label: 'Team 4' },
    { key: 'digitalMarketing', label: 'Team 5' },
    { key: 'seo', label: 'Team 6' },
  ];
  
  if (project?.workflowTeams) {
    let teamCounter = 1;
    keys.forEach(({ key }) => {
      const teamVal = project.workflowTeams[key];
      if (teamVal && (teamVal._id || typeof teamVal === 'string')) {
        stages.push(`Team ${teamCounter}`);
        teamCounter++;
      }
    });
  }
  
  if (stages.length === 1) {
    stages.push('Team 1');
  }
  
  stages.push('Completed');
  return [...new Set(stages)];
};



const ProjectDetails = () => {
  const { slug } = useParams();
  // The slug ends with the last 6 chars of the MongoDB _id (e.g. "my-project-fe5b")
  const slugSuffix = idFromSlug(slug);
  const { user } = useContext(AuthContext);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceTeams, setWorkspaceTeams] = useState([]);
  const [project, setProject] = useState(null);
  const [projectId, setProjectId] = useState(null); // real MongoDB _id resolved from slug
  const [loading, setLoading] = useState(true);
  const [handoffData, setHandoffData] = useState({ link: '', notes: '', file: null });
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [rollbackData, setRollbackData] = useState({ reason: '', targetStage: '' });
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    const newSocket = io(API_URL);
    setSocket(newSocket);
    return () => newSocket.close();
  }, [API_URL]);

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
        
        // Fetch full project details (including deliverables)
        try {
          const singleProjRes = await axios.get(`/workspaces/${ws._id}/projects/${resolvedId}`);
          setProject(singleProjRes.data);
        } catch (e) {
          console.error('Failed to fetch full project details', e);
          setProject(matched);
        }

        let reqs = [
          axios.get(`/workspaces/${ws._id}/teams`).catch(e => ({ error: true, data: e }))
        ];
        if (user?.role !== 'employee') {
          reqs.push(axios.get(`/workspaces/${ws._id}/projects/members`).catch(e => ({ error: true, data: e })));
        }

        const [teamsRes, membersRes] = await Promise.all(reqs);

        if (teamsRes && !teamsRes.error) {
          setWorkspaceTeams(teamsRes.data);
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

  const [stagePopupVisible, setStagePopupVisible] = useState(false);
  const [advancedStageName, setAdvancedStageName] = useState('');

  const getActiveTeamId = () => {
    if (!project || !project.workflowTeams) return null;
    
    const validStages = getValidStages(project);
    let currentStage = project.stage;
    if (!validStages.includes(currentStage)) {
       currentStage = validStages[0];
    }

    const stageIndex = validStages.indexOf(currentStage);
    if (stageIndex <= 0 || currentStage === 'Completed') return null;

    const keys = ['uiux', 'tech', 'test', 'devops', 'digitalMarketing', 'seo'];
    const assignedKeys = keys.filter(k => {
      const val = project.workflowTeams[k];
      return val && (val._id || typeof val === 'string');
    });

    const targetKey = assignedKeys[stageIndex - 1];
    if (!targetKey) return null;
    return project.workflowTeams[targetKey]?._id || project.workflowTeams[targetKey];
  };

  const isUserInActiveTeam = () => {
    if (!project || !workspaceTeams.length) return false;
    const activeTeamId = getActiveTeamId();
    if (!activeTeamId) return false;

    const team = workspaceTeams.find(t => String(t._id) === String(activeTeamId));
    if (!team) return false;

    if (String(team.leader?._id || team.leader) === String(user._id)) return true;
    if (team.members.some(m => String(m._id || m) === String(user._id))) return true;
    
    return false;
  };

  const isUserActiveTL = () => {
    if (!project || !workspaceTeams.length) return false;
    const activeTeamId = getActiveTeamId();
    if (!activeTeamId) return false;

    const team = workspaceTeams.find(t => String(t._id) === String(activeTeamId));
    if (!team) return false;

    return String(team.leader?._id || team.leader) === String(user._id);
  };

  const isUserAnyTL = () => {
    if (!project || !workspaceTeams.length) return false;
    
    for (const key in project.workflowTeams) {
      const teamId = project.workflowTeams[key]?._id || project.workflowTeams[key];
      if (teamId) {
        const team = workspaceTeams.find(t => String(t._id) === String(teamId));
        if (team && String(team.leader?._id || team.leader) === String(user._id)) {
          return true;
        }
      }
    }
    return false;
  };

  const handleAdvanceStageClick = () => {
    setIsHandoffModalOpen(true);
  };

  const handleAdvanceStageSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let fileUrl = null;
      let fileName = null;

      if (handoffData.file) {
        const formData = new FormData();
        formData.append('file', handoffData.file);
        const uploadRes = await axios.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        fileUrl = uploadRes.data.url;
        fileName = uploadRes.data.fileName;
      }

      const res = await axios.put(`/workspaces/${workspaceId}/projects/${projectId}/advance`, {
        deliverableLink: handoffData.link,
        deliverableNotes: handoffData.notes,
        deliverableFileUrl: fileUrl,
        deliverableFileName: fileName
      });
      setProject(res.data);
      setAdvancedStageName(res.data.stage);
      setIsHandoffModalOpen(false);
      setHandoffData({ link: '', notes: '', file: null });
      setStagePopupVisible(true);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to advance stage');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRollbackRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`/workspaces/${workspaceId}/projects/${projectId}/rollback`, rollbackData);
      setProject(res.data);
      setIsRollbackModalOpen(false);
      setRollbackData({ reason: '', targetStage: '' });
      alert('Rollback requested successfully');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to request rollback');
    }
  };

  const handleRollbackApprove = async (approved) => {
    try {
      const res = await axios.post(`/workspaces/${workspaceId}/projects/${projectId}/rollback/approve`, { approved });
      setProject(res.data);
      alert(`Rollback ${approved ? 'approved' : 'rejected'}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to process rollback');
    }
  };

  return (
    <div className="h-full flex flex-col font-sans p-6 pt-8">
      {/* Premium Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center space-x-4">
          <Link to="/projects" className="bg-bg-secondary p-2.5 rounded-xl border border-border shadow-sm text-text-secondary hover:text-accent-blue hover:border-accent-blue/30 hover:shadow-hover transition-all mt-1">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center">
              {project ? project.title : 'Project'} 
            </h1>
            <p className="text-sm text-text-secondary mt-1">{project?.description || 'Track project progress.'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {project?.stage !== 'Completed' && (
            <>
              {(isUserActiveTL() || isUserInActiveTeam() || String(project?.coordinator?._id || project?.coordinator) === String(user?._id) || ['super_admin', 'hr'].includes(user?.role)) && (
                <button
                  onClick={() => setIsRollbackModalOpen(true)}
                  className="bg-bg-primary border border-danger/50 text-danger shadow-sm px-4 py-2 rounded-lg hover:bg-danger hover:text-white transition-all text-sm font-medium flex items-center space-x-2"
                >
                  <span>Request Block / Rollback</span>
                </button>
              )}
              {(isUserActiveTL() || String(project?.coordinator?._id || project?.coordinator) === String(user?._id) || ['super_admin', 'hr'].includes(user?.role)) && (
                <button
                  onClick={handleAdvanceStageClick}
                  className="bg-bg-primary border border-border text-text-primary shadow-sm px-4 py-2 rounded-lg hover:bg-bg-secondary transition-all text-sm font-medium flex items-center space-x-2"
                >
                  <Flag size={14} className="text-success" />
                  <span>Mark Stage Complete</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
        {/* Premium Pipeline Stage Tracker */}
      {['super_admin', 'hr', 'team_leader'].includes(user?.role) && (
        <div className="bg-bg-secondary/40 backdrop-blur-md border border-border/60 rounded-2xl p-4 mb-6 flex items-center justify-between w-full overflow-x-auto custom-scrollbar shadow-lg shadow-bg-secondary/20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 via-transparent to-success/5 rounded-2xl pointer-events-none"></div>
          <div className="flex items-center w-full min-w-max relative z-10 px-2 gap-4">
            {(() => {
              let stages = getValidStages(project);
              
              if (stages.length === 0) stages.push('Completed');

              let currentStage = project?.stage;
              if (!stages.includes(currentStage)) {
                currentStage = stages[0];
              }

              return stages.map((s, i, arr) => {
                const isActive = currentStage === s;
                const isPast = arr.indexOf(currentStage) > i;
                const isLast = i === arr.length - 1;
                
                return (
                  <div key={s} className="flex items-center flex-1 shrink-0 relative group">
                    <div className={`flex flex-col items-center justify-center space-y-2 relative z-10 w-24 transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105'}`}>
                      {/* Step Indicator */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-md transition-all duration-300 relative ${
                        isActive ? 'bg-gradient-to-br from-accent-blue to-accent-indigo text-white ring-4 ring-accent-blue/20 shadow-accent-blue/40' : 
                        isPast ? 'bg-gradient-to-br from-success to-emerald-500 text-white shadow-success/30' : 
                        'bg-bg-primary text-text-secondary border-2 border-border group-hover:border-accent-blue/30'
                      }`}>
                        {isActive && <div className="absolute -inset-1 rounded-xl bg-accent-blue/20 animate-ping opacity-75"></div>}
                        {isPast ? <Check size={14} className="stroke-[3px]" /> : i + 1}
                      </div>
                      {/* Stage Label */}
                      <span className={`text-[11px] uppercase tracking-widest font-extrabold whitespace-nowrap transition-colors duration-300 ${
                        isActive ? 'text-accent-blue' : 
                        isPast ? 'text-text-primary' : 
                        'text-text-secondary/60'
                      }`}>
                        {s}
                      </span>
                    </div>

                    {/* Connecting Line */}
                    {!isLast && (
                      <div className="absolute left-1/2 right-[-50%] top-4 -translate-y-1/2 flex items-center px-4 pointer-events-none">
                         <div className={`h-[3px] w-full rounded-full transition-all duration-500 overflow-hidden bg-border/40 relative`}>
                            {isPast && <div className="absolute inset-0 bg-gradient-to-r from-success to-emerald-400 w-full animate-pulse"></div>}
                         </div>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Rollback Request Banner */}
      {project?.rollbackRequest?.isRequested && (
        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div>
            <h4 className="text-danger font-bold text-sm flex items-center"><X size={16} className="mr-1" /> Project Blocked (Rollback Requested)</h4>
            <p className="text-text-primary text-xs mt-1"><span className="font-semibold text-text-secondary">Reason:</span> {project.rollbackRequest.reason}</p>
            <p className="text-text-primary text-xs"><span className="font-semibold text-text-secondary">Target Stage:</span> {project.rollbackRequest.targetStage}</p>
          </div>
          {(['super_admin', 'hr', 'team_leader'].includes(user?.role) || (user?.designation || '').toLowerCase().includes('coordinator')) && (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => handleRollbackApprove(false)} className="px-4 py-2 rounded-lg bg-bg-primary border border-border text-text-secondary hover:bg-bg-secondary text-xs font-bold transition-colors">
                Reject
              </button>
              <button onClick={() => handleRollbackApprove(true)} className="px-4 py-2 rounded-lg bg-danger text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity">
                Approve Rollback
              </button>
            </div>
          )}
        </div>
      )}

      {/* Deliverables Display */}
      {project?.deliverables && project.deliverables.length > 0 && (
        <div className="bg-bg-secondary/40 border border-border/60 rounded-2xl p-4 mb-6 shadow-sm">
          <h4 className="text-sm font-bold text-text-primary mb-3">Handoff Deliverables</h4>
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
            {project.deliverables.map((del, i) => (
              <div key={i} className="bg-bg-primary border border-border rounded-xl p-3 min-w-[250px] shrink-0">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-md uppercase tracking-wider">{del.stage}</span>
                  <span className="text-[10px] text-text-secondary">{new Date(del.submittedAt).toLocaleDateString()}</span>
                </div>
                {del.fileUrl && (
                  <a href={del.fileUrl.startsWith('http') ? del.fileUrl : `${API_URL}${del.fileUrl}`} download={del.fileName} target="_blank" rel="noopener noreferrer" className="flex items-center text-xs text-white bg-accent-blue/90 hover:bg-accent-blue px-3 py-1.5 rounded-lg transition-colors mb-2 w-max shadow-sm group/btn">
                    <Download size={14} className="mr-1.5 opacity-80 group-hover/btn:opacity-100" />
                    <span className="truncate max-w-[150px]">{del.fileName || 'Download File'}</span>
                  </a>
                )}
                {del.link && (
                  <a href={del.link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-blue hover:underline mb-1 block truncate">
                    {del.link}
                  </a>
                )}
                {del.notes && <p className="text-xs text-text-secondary line-clamp-2 mt-1">{del.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>


      {/* Custom Stage Completion Popup */}
      {stagePopupVisible && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-sm p-6 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="h-16 w-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
              <Check size={32} />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Stage Completed!</h3>
            <p className="text-sm text-text-secondary mb-6">
              The project has successfully advanced to the <span className="font-bold text-accent-blue">{advancedStageName}</span> stage.
            </p>
            <button
              onClick={() => setStagePopupVisible(false)}
              className="w-full bg-gradient-to-r from-success to-emerald-500 text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-success/20"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Handoff Modal */}
      {isHandoffModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-text-primary">Stage Handoff</h3>
                <p className="text-xs text-text-secondary">Provide any necessary links or notes for the next team.</p>
              </div>
              <button onClick={() => setIsHandoffModalOpen(false)} className="text-text-secondary hover:text-danger p-1 rounded-full hover:bg-bg-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdvanceStageSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">Upload File (ZIP, PDF, DOC, Figma file)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-border border-dashed rounded-xl cursor-pointer bg-bg-primary/50 hover:bg-bg-primary transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Paperclip size={24} className="text-text-secondary/50 mb-2" />
                      <p className="text-xs text-text-secondary">
                        {handoffData.file ? <span className="font-bold text-accent-blue">{handoffData.file.name}</span> : 'Click to upload or drag and drop'}
                      </p>
                    </div>
                    <input type="file" className="hidden" onChange={(e) => setHandoffData({ ...handoffData, file: e.target.files[0] })} />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">Deliverable Link (Figma, GitHub, etc.)</label>
                <input
                  type="url"
                  value={handoffData.link}
                  onChange={(e) => setHandoffData({ ...handoffData, link: e.target.value })}
                  className="premium-input"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">Notes</label>
                <textarea
                  rows="3"
                  value={handoffData.notes}
                  onChange={(e) => setHandoffData({ ...handoffData, notes: e.target.value })}
                  className="premium-input resize-none"
                  placeholder="Additional instructions..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" disabled={isUploading} onClick={() => setIsHandoffModalOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-primary rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-5 py-2 text-sm bg-accent-blue text-white rounded-lg hover:opacity-90 font-bold shadow-md shadow-accent-blue/20 flex items-center">
                  {isUploading ? (
                    <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2"></span> Uploading...</>
                  ) : 'Complete Stage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rollback Request Modal */}
      {isRollbackModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-danger">Request Block / Rollback</h3>
                <p className="text-xs text-text-secondary">Explain why this project cannot proceed.</p>
              </div>
              <button onClick={() => setIsRollbackModalOpen(false)} className="text-text-secondary hover:text-danger p-1 rounded-full hover:bg-bg-primary transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleRollbackRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">Reason for Rollback</label>
                <textarea
                  required
                  rows="3"
                  value={rollbackData.reason}
                  onChange={(e) => setRollbackData({ ...rollbackData, reason: e.target.value })}
                  className="premium-input resize-none"
                  placeholder="e.g. Client requested design changes..."
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-2">Target Stage</label>
                <select
                  required
                  value={rollbackData.targetStage}
                  onChange={(e) => setRollbackData({ ...rollbackData, targetStage: e.target.value })}
                  className="premium-input"
                >
                  <option value="">Select Stage to revert to</option>
                  {getValidStages(project)
                    .filter(s => s !== 'Completed' && s !== project?.stage)
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setIsRollbackModalOpen(false)} className="px-4 py-2 text-sm text-text-secondary hover:bg-bg-primary rounded-lg transition-colors font-medium">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm bg-danger text-white rounded-lg hover:opacity-90 font-bold shadow-md shadow-danger/20">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;
