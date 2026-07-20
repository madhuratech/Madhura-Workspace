import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Plus, X } from 'lucide-react';

const Meetings = () => {
  const [events, setEvents] = useState([
    { id: '1', title: 'Sprint Planning', date: new Date().toISOString().split('T')[0] },
    { id: '2', title: 'Client Review', date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', date: '' });

  const handleDateClick = (arg) => {
    setFormData({ title: '', date: arg.dateStr });
    setIsModalOpen(true);
  };

  const handleOpenModal = () => {
    setFormData({ title: '', date: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setEvents([...events, {
      id: Date.now().toString(),
      title: formData.title,
      date: formData.date
    }]);
    setIsModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-wide">Meetings</h1>
        <button 
          onClick={handleOpenModal}
          className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Schedule Meeting</span>
        </button>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm p-6 relative">
        <style>{`
          .fc {
            --fc-page-bg-color: transparent;
            --fc-neutral-bg-color: var(--bg-primary);
            --fc-neutral-text-color: var(--text-primary);
            --fc-border-color: var(--border-color);
            --fc-button-text-color: var(--text-primary);
            --fc-button-bg-color: var(--bg-primary);
            --fc-button-border-color: var(--border-color);
            --fc-button-hover-bg-color: var(--bg-secondary);
            --fc-button-hover-border-color: var(--accent-blue);
            --fc-button-active-bg-color: var(--accent-blue);
            --fc-button-active-border-color: var(--accent-blue);
            --fc-event-bg-color: var(--accent-blue);
            --fc-event-border-color: var(--accent-blue);
            --fc-event-text-color: #fff;
            font-family: 'Inter', sans-serif;
            color: var(--text-primary);
          }
          .fc-theme-standard td, .fc-theme-standard th {
            border-color: var(--border-color);
          }
          .fc .fc-toolbar-title {
            font-size: 1.25rem;
            font-weight: 700;
          }
          .fc-daygrid-day-number {
            color: var(--text-secondary);
          }
        `}</style>
        
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          height="100%"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay'
          }}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">Schedule Meeting</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Meeting Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
                <input 
                  type="date" required min={new Date().toISOString().split('T')[0]}
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                />
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
