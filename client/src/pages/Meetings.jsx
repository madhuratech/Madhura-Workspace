import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Plus, X, Video, Users as UsersIcon, Link as LinkIcon, Info, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const Meetings = () => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspace, setWorkspace] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' or 'logs'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    date: '', 
    time: '',
    type: 'direct_meet', 
    link: '', 
    description: '',
    participantType: 'all', // 'all', 'team', 'role', 'specific'
    selectedTeam: '',
    selectedRole: 'employee',
    selectedMembers: []
  });

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const currentWs = wsRes.data[0];
        setWorkspace(currentWs);
        
        // Fetch Meetings
        const meetingsRes = await axios.get(`/workspaces/${currentWs._id}/meetings`);
        setMeetings(meetingsRes.data);

        // Fetch Members
        const detailRes = await axios.get(`/workspaces/${currentWs._id}`);
        const validMembers = (detailRes.data.members || []).filter(m => m.user);
        setMembers(validMembers);
        
        // Fetch Teams
        const teamsRes = await axios.get(`/workspaces/${currentWs._id}/teams`);
        setTeams(teamsRes.data || []);
      }
    } catch (error) {
      console.error('Error fetching workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (arg) => {
    resetForm(arg.dateStr);
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    resetForm(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const resetForm = (dateVal) => {
    setFormData({ 
      title: '', 
      date: dateVal, 
      time: '',
      type: 'direct_meet', 
      link: '', 
      description: '',
      participantType: 'all',
      selectedTeam: '',
      selectedRole: 'employee',
      selectedMembers: []
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!workspace) return;

    // Resolve participants based on selection
    let participantsIds = [];
    if (formData.participantType === 'all') {
      participantsIds = members.map(m => m.user._id);
    } else if (formData.participantType === 'team' && formData.selectedTeam) {
      const team = teams.find(t => t._id === formData.selectedTeam);
      if (team) {
        participantsIds = [...team.members.map(m => m._id || m), team.leader._id || team.leader];
      }
    } else if (formData.participantType === 'role') {
      participantsIds = members.filter(m => m.role === formData.selectedRole).map(m => m.user._id);
    } else if (formData.participantType === 'specific') {
      participantsIds = formData.selectedMembers;
    }

    // Ensure current user is in participants
    if (!participantsIds.includes(user._id)) {
      participantsIds.push(user._id);
    }

    try {
      await axios.post(`/workspaces/${workspace._id}/meetings`, {
        title: formData.title,
        date: formData.date,
        time: formData.time,
        type: formData.type,
        link: formData.link,
        description: formData.description,
        participants: participantsIds
      });
      showToast('Meeting created successfully!', 'success');
      fetchWorkspaceData();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Error creating meeting', 'error');
    }
  };

  const [currentDate, setCurrentDate] = useState(new Date());

  const renderCustomCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div className="flex flex-col h-full animate-fade-in">
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border/40 bg-bg-primary/60 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary tracking-tight">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <div className="flex space-x-2 bg-bg-secondary/80 backdrop-blur-md p-1.5 rounded-xl border border-border/50 shadow-sm">
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2.5 hover:bg-bg-primary hover:shadow-sm rounded-lg transition-all text-text-secondary hover:text-accent-blue"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 hover:bg-bg-primary hover:shadow-sm rounded-lg transition-all font-bold text-sm text-text-primary">Today</button>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2.5 hover:bg-bg-primary hover:shadow-sm rounded-lg transition-all text-text-secondary hover:text-accent-blue"><ChevronRight size={20} /></button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-bg-secondary/20">
          <div className="grid grid-cols-7 gap-3 h-full">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={d} className={`text-center text-xs font-black uppercase tracking-wider py-2 ${i === 0 || i === 6 ? 'text-text-secondary/60' : 'text-text-secondary'}`}>
                {d}
              </div>
            ))}
            
            {days.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-[80px] rounded-2xl bg-transparent"></div>;
              
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = meetings.filter(m => new Date(m.date).toISOString().split('T')[0] === dateStr);
              // Sort events by time if available
              dayEvents.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
              
              const isToday = dateStr === new Date().toISOString().split('T')[0];
              const isPast = new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
              
              return (
                <div 
                  key={day} 
                  onClick={() => { resetForm(dateStr); setIsModalOpen(true); }}
                  className={`min-h-[100px] p-3 border rounded-[20px] cursor-pointer transition-all duration-300 flex flex-col group relative overflow-hidden
                    ${isToday 
                      ? 'border-accent-blue/50 bg-gradient-to-b from-accent-blue/10 to-transparent shadow-[0_5px_25px_rgba(59,130,246,0.15)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.25)] hover:-translate-y-1 z-10' 
                      : 'border-border/60 bg-bg-primary/50 hover:border-accent-blue/40 hover:shadow-xl hover:-translate-y-1 hover:bg-bg-primary'}
                    ${isPast && !isToday ? 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0' : ''}
                  `}
                >
                  {isToday && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-blue to-purple-500"></div>}
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-xl text-sm font-black transition-colors ${
                      isToday ? 'bg-gradient-to-br from-accent-blue to-blue-600 text-white shadow-md' : 'text-text-primary group-hover:text-accent-blue'
                    }`}>
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-2 py-0.5 rounded-full shadow-inner">
                        {dayEvents.length} {dayEvents.length === 1 ? 'Meet' : 'Meets'}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 mt-1 flex-1 overflow-y-auto custom-scrollbar pr-1 -mr-1">
                    {dayEvents.map((evt, eIdx) => (
                      <div 
                        key={evt._id} 
                        className={`text-xs px-2 py-1.5 rounded-xl border flex flex-col space-y-1 transition-all hover:scale-[1.02] ${
                          evt.type === 'google_meet' 
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        }`}
                        title={evt.title}
                        style={{ animationDelay: `${eIdx * 50}ms` }}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate pr-1">{evt.title}</span>
                        </div>
                        <div className="flex items-center text-[10px] opacity-80 font-semibold space-x-2">
                          {evt.time && <span>{evt.time}</span>}
                          {evt.type === 'google_meet' ? <Video size={10}/> : <UsersIcon size={10}/>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-primary h-full animate-fade-in">
      <div className="w-12 h-12 border-4 border-border border-t-accent-blue rounded-full animate-spin mb-4"></div>
      <p className="text-text-secondary font-medium">Loading workspace...</p>
    </div>
  );
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="relative mb-8 p-6 rounded-3xl overflow-hidden bg-gradient-to-r from-bg-secondary to-bg-primary border border-border/50 shadow-[0_0_40px_rgba(0,0,0,0.03)] z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent-blue/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
        <div className="flex justify-between items-center relative z-20">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary tracking-tight font-outfit">Meetings</h1>
            <p className="text-text-secondary text-sm mt-1.5 font-medium">Schedule and view team meetings</p>
          </div>
          {user?.role !== 'employee' && (
            <button 
              onClick={handleOpenModal}
              className="bg-gradient-to-r from-accent-blue to-blue-600 text-white px-6 py-3 rounded-2xl hover:shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition-all duration-300 transform hover:-translate-y-1 text-sm font-bold flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Schedule Meeting</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-bg-secondary/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 shadow-sm w-max mb-6">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`px-6 py-2.5 font-bold text-sm transition-all rounded-xl ${activeTab === 'calendar' ? 'bg-bg-primary text-accent-blue shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'}`}
        >
          Calendar View
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-2.5 font-bold text-sm transition-all rounded-xl ${activeTab === 'logs' ? 'bg-bg-primary text-accent-blue shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary/50'}`}
        >
          Meeting Logs
        </button>
      </div>

      <div className="bg-transparent flex-1 flex flex-col overflow-hidden relative border-none">
        {activeTab === 'calendar' ? (
          <div className="w-full mx-auto flex-1 flex flex-col bg-bg-secondary/80 backdrop-blur-xl rounded-3xl shadow-[0_5px_30px_rgba(0,0,0,0.05)] border border-border/50 overflow-hidden">
            {renderCustomCalendar()}
          </div>
        ) : (
          <div className="bg-bg-secondary/80 backdrop-blur-xl border border-border/50 rounded-3xl shadow-[0_5px_30px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col max-h-full">
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="text-left">Date</th>
                    <th className="text-left">Meeting Title</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Participants</th>
                  </tr>
                </thead>
                <tbody>
                  {meetings.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-text-secondary">No meetings scheduled yet.</td>
                    </tr>
                  ) : (
                    meetings.sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => (
                      <tr key={m._id}>
                        <td className="font-medium">{new Date(m.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-text-primary">{m.title} <span className="text-xs font-bold text-text-secondary bg-bg-primary px-2 py-1 rounded-lg ml-2">{m.time}</span></td>
                        <td className="px-6 py-4">
                          {m.type === 'google_meet' ? (
                            <div className="flex items-center text-accent-blue font-bold">
                              <Video size={16} className="mr-2" /> Online meeting
                              {m.link && (
                                <a href={m.link} target="_blank" rel="noopener noreferrer" className="ml-4 text-xs bg-accent-blue/10 border border-accent-blue/20 text-accent-blue px-3 py-1.5 rounded-lg hover:bg-accent-blue hover:text-white transition-colors">
                                  Attend Meeting
                                </a>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center text-text-secondary">
                              <UsersIcon size={14} className="mr-1.5" /> Direct Meet
                            </div>
                          )}
                        </td>
                        <td className="text-text-secondary text-xs">
                          {m.participants?.length || 0} Members invited
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary/90 backdrop-blur-xl border border-border/50 p-8 rounded-[2rem] w-full max-w-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-accent-blue to-purple-500"></div>
            <div className="flex justify-between items-center mb-8 mt-2 sticky top-0 bg-bg-secondary/90 backdrop-blur z-10 pt-2 pb-4">
              <h3 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary font-outfit">Schedule Meeting</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary bg-bg-primary hover:bg-border/50 p-2.5 rounded-xl transition-all"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] font-extrabold text-text-secondary mb-2 uppercase tracking-widest">Meeting Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue focus:shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all"
                  placeholder="e.g. Weekly Standup"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                  <input 
                    type="date" required min={new Date().toISOString().split('T')[0]}
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Time</label>
                  <input 
                    type="time"
                    value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Meeting Type</label>
                  <select 
                    value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  >
                    <option value="direct_meet">Direct Meet (In Person)</option>
                    <option value="google_meet">Online meeting</option>
                  </select>
                </div>
              </div>

              {formData.type === 'google_meet' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1 flex items-center">
                    <LinkIcon size={14} className="mr-1"/> Meeting Link
                  </label>
                  <input 
                    type="url" 
                    value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})}
                    className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue text-sm"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  />
                  <p className="text-[10px] text-text-secondary mt-1 flex items-center">
                    <Info size={10} className="mr-1"/> Provide a manual link.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
                <textarea 
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue resize-none"
                  rows="2"
                />
              </div>

              <div className="bg-bg-primary p-4 rounded-lg border border-border">
                <label className="block text-sm font-bold text-text-primary mb-3">Add Participants By</label>
                <div className="flex flex-wrap gap-3 mb-4">
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="all" checked={formData.participantType === 'all'} onChange={() => setFormData({...formData, participantType: 'all'})} className="accent-accent-blue" />
                    <span>All Workspace Members</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="team" checked={formData.participantType === 'team'} onChange={() => setFormData({...formData, participantType: 'team'})} className="accent-accent-blue" />
                    <span>Specific Team</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="role" checked={formData.participantType === 'role'} onChange={() => setFormData({...formData, participantType: 'role'})} className="accent-accent-blue" />
                    <span>Specific Role</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer text-text-secondary">
                    <input type="radio" name="pType" value="specific" checked={formData.participantType === 'specific'} onChange={() => setFormData({...formData, participantType: 'specific', selectedMembers: []})} className="accent-accent-blue" />
                    <span>Select Individuals</span>
                  </label>
                </div>

                {formData.participantType === 'team' && (
                  <select 
                    value={formData.selectedTeam} onChange={e => setFormData({...formData, selectedTeam: e.target.value})}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none text-sm"
                    required
                  >
                    <option value="">-- Choose Team --</option>
                    {teams.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                  </select>
                )}

                {formData.participantType === 'role' && (
                  <select 
                    value={formData.selectedRole} onChange={e => setFormData({...formData, selectedRole: e.target.value})}
                    className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none text-sm"
                    required
                  >
                    <option value="super_admin">Super Admins</option>
                    <option value="hr">HR</option>
                    <option value="team_leader">Team Leaders</option>
                    <option value="employee">Employees</option>
                  </select>
                )}

                {formData.participantType === 'specific' && (
                  <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-2 bg-bg-secondary space-y-1 custom-scrollbar">
                    {members.filter(m => m.user._id !== user._id).map(m => (
                      <label key={m.user._id} className="flex items-center space-x-3 p-1.5 hover:bg-bg-primary rounded-lg cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="accent-accent-blue"
                          checked={formData.selectedMembers.includes(m.user._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({...formData, selectedMembers: [...formData.selectedMembers, m.user._id]});
                            } else {
                              setFormData({...formData, selectedMembers: formData.selectedMembers.filter(id => id !== m.user._id)});
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-text-primary">{m.user.name}</span>
                          <span className="text-[10px] text-text-secondary">{m.role.replace('_', ' ')}</span>
                        </div>
                      </label>
                    ))}
                    {members.length <= 1 && <p className="text-xs text-text-secondary p-1">No other members available.</p>}
                  </div>
                )}
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors">
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meetings;
