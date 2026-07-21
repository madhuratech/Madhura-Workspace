import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, X, Video, Users as UsersIcon, Link as LinkIcon, Info } from 'lucide-react';

const Meetings = () => {
  const { user } = useContext(AuthContext);
  const [workspace, setWorkspace] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    date: '', 
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
        type: formData.type,
        link: formData.link,
        description: formData.description,
        participants: participantsIds
      });
      fetchWorkspaceData();
      setIsModalOpen(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Error creating meeting');
    }
  };

  // Convert meetings to calendar events
  const calendarEvents = meetings.map(m => ({
    id: m._id,
    title: m.title,
    date: new Date(m.date).toISOString().split('T')[0],
    extendedProps: { ...m }
  }));

  const renderEventContent = (eventInfo) => {
    const isGoogleMeet = eventInfo.event.extendedProps.type === 'google_meet';
    return (
      <div className="flex items-center space-x-1 p-0.5 px-1 truncate w-full">
        {isGoogleMeet ? <Video size={10} className="shrink-0" /> : <UsersIcon size={10} className="shrink-0" />}
        <span className="text-[10px] font-medium truncate">{eventInfo.event.title}</span>
      </div>
    );
  };

  if (loading) return <div className="p-8 text-text-secondary">Loading calendar...</div>;
  if (!workspace) return <div className="p-8 text-danger">Please create a workspace first.</div>;

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">Meetings</h1>
          <p className="text-text-secondary mt-1">Schedule and view team meetings</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Schedule Meeting</span>
        </button>
      </div>

      <div className="bg-bg-primary flex-1 flex flex-col overflow-hidden relative border-none">
        <style>{`
          .fc {
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: transparent;
            --fc-neutral-text-color: var(--text-primary);
            --fc-border-color: rgba(150, 150, 150, 0.1); /* Very subtle borders */
            --fc-button-text-color: var(--text-secondary);
            --fc-button-bg-color: transparent;
            --fc-button-border-color: transparent;
            --fc-button-hover-bg-color: var(--bg-secondary);
            --fc-button-hover-border-color: transparent;
            --fc-button-active-bg-color: var(--bg-secondary);
            --fc-button-active-border-color: transparent;
            --fc-event-bg-color: transparent;
            --fc-event-border-color: transparent;
            font-family: 'Inter', sans-serif;
            color: var(--text-primary);
          }
          
          .fc-theme-standard td, .fc-theme-standard th {
            border-color: var(--fc-border-color);
            border-width: 1px;
            border-style: solid;
          }
          
          /* Remove outer border for minimalist look */
          .fc-scrollgrid {
             border: none !important;
          }
          
          .fc .fc-toolbar-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
          }
          
          .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active {
            color: var(--text-primary);
            font-weight: 600;
            box-shadow: none;
          }
          
          .fc .fc-button-primary:focus {
            box-shadow: none;
          }

          .fc-daygrid-day-number {
            color: var(--text-secondary);
            font-size: 0.85rem;
            font-weight: 500;
            padding: 8px !important;
          }
          
          .fc-daygrid-day.fc-day-today {
            background-color: var(--accent-blue) !important;
            opacity: 0.05;
          }
          
          .fc-daygrid-day-top {
            flex-direction: row;
            justify-content: flex-end;
          }
          
          .fc-event {
             background-color: var(--accent-blue);
             color: white;
             border-radius: 6px;
             margin: 2px 4px;
             border: none;
             box-shadow: 0 1px 3px rgba(0,0,0,0.1);
             transition: transform 0.2s, box-shadow 0.2s;
             cursor: pointer;
          }
          
          .fc-event:hover {
             transform: translateY(-1px);
             box-shadow: 0 4px 6px rgba(0,0,0,0.15);
             background-color: #3b82f6; /* slightly lighter blue */
          }
        `}</style>
        
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={calendarEvents}
          dateClick={handleDateClick}
          eventContent={renderEventContent}
          height="100%"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border p-6 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-bg-secondary z-10 pt-2 pb-4">
              <h3 className="text-xl font-bold text-text-primary">Schedule Meeting</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-danger transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Meeting Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g. Weekly Standup"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                  <input 
                    type="date" required min={new Date().toISOString().split('T')[0]}
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
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
                    <option value="google_meet">Google Meet (Online)</option>
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
