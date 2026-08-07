import React, { useState, useEffect, useContext } from 'react';
import { Megaphone, Plus, X, Building, Users, AlertTriangle, Clock } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const Announcements = () => {
  const { user } = useContext(AuthContext);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', type: 'Company' });

  const isAuthorized = user?.role === 'super_admin' || user?.role === 'hr';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get('/announcements');
      setAnnouncements(res.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    try {
      const res = await axios.post('/announcements', formData);
      setAnnouncements([res.data, ...announcements]);
      setShowModal(false);
      setFormData({ title: '', content: '', type: 'Company' });
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await axios.delete(`/announcements/${id}`);
        setAnnouncements(announcements.filter(a => a._id !== id));
      } catch (error) {
        console.error('Error deleting announcement:', error);
      }
    }
  };

  const getTypeStyle = (type) => {
    switch(type) {
      case 'Company': return { icon: <Building size={14} />, color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'Department': return { icon: <Users size={14} />, color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'Alert': return { icon: <AlertTriangle size={14} />, color: 'bg-red-100 text-red-800 border-red-200' };
      default: return { icon: <Megaphone size={14} />, color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-accent-blue rounded-xl">
              <Megaphone size={24} />
            </div>
            Notice Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">Company announcements, department notices, and alerts.</p>
        </div>
        {isAuthorized && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#1b2b4c] text-white hover:text-[#ffca22] px-5 py-2.5 rounded-xl hover:bg-[#1b2b4c]/90 transition-colors shadow-sm font-medium flex items-center gap-2"
          >
            <Plus size={18} /> New Post
          </button>
        )}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>
        ) : announcements.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
            <Megaphone size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Announcements</h3>
            <p className="text-sm text-gray-500 mt-1">Check back later for company updates.</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const style = getTypeStyle(announcement.type);
            return (
              <div key={announcement._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar user={announcement.author} size="w-12 h-12" textClass="text-lg" showStatus={false} className="border-2 border-white shadow-sm" />
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{announcement.author?.name || 'Admin'}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12}/> {new Date(announcement.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${style.color}`}>
                          {style.icon} {announcement.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  {(isAuthorized || (user && announcement.author?._id === user._id)) && (
                    <button onClick={() => handleDelete(announcement._id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium">
                      Delete
                    </button>
                  )}
                </div>
                
                <h2 className="text-lg font-bold text-gray-900 mb-2">{announcement.title}</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm bg-gray-50/50 p-4 rounded-xl border border-gray-50">{announcement.content}</p>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="text-accent-blue" size={20} />
                Post Announcement
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Announcement Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm"
                  placeholder="e.g., Company Offsite 2026!"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                <select 
                  value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm cursor-pointer"
                >
                  <option value="Company">Company Announcement</option>
                  <option value="Department">Department Notice</option>
                  <option value="Alert">Important Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Message Content</label>
                <textarea 
                  required rows="5"
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm resize-none"
                  placeholder="Write your announcement here..."
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 text-sm bg-[#1b2b4c] text-white hover:text-[#ffca22] font-medium rounded-lg hover:bg-[#1b2b4c]/90 transition-colors shadow-sm flex items-center gap-2">
                  <Megaphone size={16} /> Post Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
