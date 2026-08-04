import React, { useState, useEffect, useContext } from 'react';
import { Plus, Ticket as TicketIcon, Search, AlertCircle, CheckCircle2, Clock, CheckCircle, ChevronDown, User, MessageSquare } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Tickets = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Create ticket state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    department: 'General'
  });

  // Comment state
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get('/tickets');
      setTickets(res.data);
    } catch (error) {
      console.error('Error fetching tickets', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/tickets', formData);
      setTickets([res.data, ...tickets]);
      setShowModal(false);
      setFormData({ title: '', description: '', priority: 'Medium', department: 'General' });
    } catch (error) {
      console.error('Error creating ticket', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await axios.put(`/tickets/${id}`, { status: newStatus });
      setTickets(tickets.map(t => t._id === id ? res.data : t));
      if (selectedTicket && selectedTicket._id === id) {
        setSelectedTicket(res.data);
      }
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTicket) return;
    try {
      const res = await axios.post(`/tickets/${selectedTicket._id}/comments`, { text: commentText });
      setTickets(tickets.map(t => t._id === selectedTicket._id ? res.data : t));
      setSelectedTicket(res.data);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment', error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'In Progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Resolved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'High': return 'text-red-600 bg-red-50';
      case 'Medium': return 'text-orange-600 bg-orange-50';
      case 'Low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <TicketIcon className="text-accent-blue" />
            Support Tickets
          </h1>
          <p className="text-text-secondary mt-1">Manage and track your support requests</p>
        </div>
        
        {user?.role === 'employee' && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-accent-blue hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm"
          >
            <Plus size={18} />
            <span className="font-medium">Raise Ticket</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-border bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>
            ) : tickets.length === 0 ? (
              <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                <TicketIcon size={40} className="mb-3 text-gray-300" />
                <p>No tickets found</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div 
                  key={ticket._id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTicket?._id === ticket._id ? 'border-accent-blue bg-blue-50/50' : 'border-border bg-white hover:border-gray-300'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{ticket.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{ticket.description}</p>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Clock size={12} /> {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl shadow-sm h-[600px] flex flex-col">
          {selectedTicket ? (
            <>
              <div className="p-6 border-b border-border flex justify-between items-start bg-gray-50/50 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-gray-900">{selectedTicket.title}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><User size={14}/> {selectedTicket.createdBy?.name || 'Unknown'}</span>
                    <span className="flex items-center gap-1"><AlertCircle size={14}/> Dept: {selectedTicket.department}</span>
                    <span className="flex items-center gap-1"><Clock size={14}/> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Status Updater for HR/IT/SuperAdmin or Creator closing it */}
                <select 
                  className="bg-white border border-border rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(selectedTicket._id, e.target.value)}
                  disabled={user?.role === 'employee' && selectedTicket.status === 'Closed'}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Description</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <MessageSquare size={14} /> Activity & Comments
                  </h4>
                  {selectedTicket.comments?.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No comments yet.</p>
                  ) : (
                    selectedTicket.comments?.map((c, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs flex-shrink-0">
                          {c.author?.name ? c.author.name.charAt(0) : 'U'}
                        </div>
                        <div className="bg-white p-3 rounded-xl rounded-tl-none border border-gray-100 shadow-sm flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-sm text-gray-800">{c.author?.name}</span>
                            <span className="text-xs text-gray-400">{new Date(c.updatedAt || c.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-gray-700">{c.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedTicket.status !== 'Closed' && (
                <div className="p-4 border-t border-border bg-white rounded-b-2xl">
                  <form onSubmit={handleAddComment} className="flex gap-3">
                    <input 
                      type="text" 
                      placeholder="Type a comment..." 
                      className="flex-1 bg-gray-50 border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />
                    <button 
                      type="submit"
                      disabled={!commentText.trim()}
                      className="bg-accent-blue hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
                    >
                      Post
                    </button>
                  </form>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <TicketIcon size={64} className="mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-gray-600 mb-2">No Ticket Selected</h3>
              <p className="text-center text-sm">Select a ticket from the list to view its details, update status, and add comments.</p>
            </div>
          )}
        </div>
      </div>

      {/* Raise Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold text-text-primary">Raise a Ticket</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
                <input 
                  type="text" 
                  required
                  className="w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="E.g. Laptop not starting"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  required
                  rows="4"
                  className="w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the issue in detail..."
                ></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    className="w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 bg-white"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  >
                    <option value="IT">IT Support</option>
                    <option value="HR">HR Dept</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    className="w-full border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 bg-white"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-border text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-accent-blue text-white font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
