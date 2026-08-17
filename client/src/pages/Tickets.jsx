import React, { useState, useEffect, useContext, useRef } from 'react';
import { Plus, Ticket as TicketIcon, Search, AlertCircle, Clock, ChevronDown, User, Send, CheckCircle, Info, X } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const Tickets = () => {
  const { user } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create ticket state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    department: 'General'
  });

  // Comment state
  const [commentText, setCommentText] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    // Scroll to bottom when a new ticket is selected or comment is added
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.comments]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/tickets');
      setTickets(res.data);
      if (res.data.length > 0 && !selectedTicket) {
        setSelectedTicket(res.data[0]);
      }
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
      setSelectedTicket(res.data);
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

  const filteredTickets = tickets.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TicketIcon className="text-accent-blue" size={24} />
            Support Tickets
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track your support requests</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-accent-blue text-accent-text px-4 py-2 rounded-lg hover:bg-accent-indigo transition-colors text-sm font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} />
          New Ticket
        </button>
      </div>

      {/* Main Slack-like layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Ticket List */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-gray-50/30 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No tickets found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map(ticket => (
                  <div 
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer transition-colors border-l-4 ${selectedTicket?._id === ticket._id ? 'bg-blue-50/80 border-accent-blue' : 'hover:bg-gray-100 border-transparent bg-white'}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 pr-2">{ticket.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">{ticket.department} Issue</p>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="flex items-center text-gray-400 gap-1"><Clock size={12}/> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                      <span className={`font-semibold px-1.5 py-0.5 rounded-sm ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Area - Chat/Details View */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedTicket.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span className="flex items-center gap-1"><Info size={14}/> {selectedTicket.department}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">Created by <span className="font-semibold text-gray-700">{selectedTicket.createdBy?.name || 'Unknown'}</span></span>
                  </div>
                </div>
                
                {/* Status Dropdown */}
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority} Priority
                  </span>
                  <div className="relative group">
                    <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status}
                      <ChevronDown size={14} />
                    </button>
                    <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                      <div className="py-1">
                        {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                          <button
                            key={status}
                            disabled={user?.role === 'employee' && status !== 'Closed' && selectedTicket.status !== status}
                            onClick={() => handleStatusChange(selectedTicket._id, status)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-accent-blue disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                
                {/* Original Ticket Description (First Message) */}
                <div className="flex gap-4 mb-8">
                  <Avatar user={selectedTicket.createdBy} size="w-10 h-10" textClass="text-sm" showStatus={false} className="shrink-0" />
                  <div className="flex-1 bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">{selectedTicket.createdBy?.name || 'Unknown'}</span>
                      <span className="text-xs text-gray-400">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-6">
                  {selectedTicket.comments?.map((comment, index) => {
                    const isSystem = !comment.author;
                    
                    if (isSystem) {
                       return (
                         <div key={index} className="flex items-center justify-center gap-2 text-xs text-gray-400 my-4">
                           <div className="w-8 h-px bg-gray-200"></div>
                           <span>{comment.text}</span>
                           <div className="w-8 h-px bg-gray-200"></div>
                         </div>
                       )
                    }

                    const isMe = comment.author?._id === user?._id || comment.author === user?._id;

                    return (
                      <div key={index} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <Avatar user={comment.author} size="w-8 h-8" textClass="text-xs" showStatus={false} className="shrink-0" />
                        <div className={`flex-1 max-w-[80%] ${isMe ? 'text-right' : ''}`}>
                          <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="font-bold text-gray-900 text-xs">{comment.author?.name || 'Agent'}</span>
                            <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                          </div>
                          <div className={`inline-block p-3 rounded-2xl border text-sm text-left shadow-sm ${isMe ? 'bg-accent-blue text-accent-text border-transparent rounded-tr-none' : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'}`}>
                            {comment.text}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              {selectedTicket.status !== 'Closed' ? (
                <div className="p-4 bg-white border-t border-gray-200 z-10">
                  <form onSubmit={handleAddComment} className="relative">
                    <input 
                      type="text" 
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Type your reply here..." 
                      className="w-full bg-gray-50 border border-gray-300 rounded-full pl-5 pr-14 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all shadow-sm"
                    />
                    <button 
                      type="submit"
                      disabled={!commentText.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent-blue text-accent-text rounded-full hover:bg-accent-indigo disabled:opacity-50 transition-colors shadow-sm"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                  <p className="text-[10px] text-gray-400 mt-2 text-center">Press Enter to send. Use polite and professional language.</p>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border-t border-gray-200 text-center text-gray-500 flex flex-col items-center gap-2">
                  <CheckCircle size={24} className="text-gray-400" />
                  <p className="text-sm font-medium">This ticket is closed and cannot receive new comments.</p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
               <TicketIcon size={64} className="mb-4 text-gray-200" strokeWidth={1} />
               <p className="text-lg font-medium text-gray-600">No Ticket Selected</p>
               <p className="text-sm mt-1">Select a ticket from the sidebar or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="text-accent-blue" size={20} />
                Raise New Ticket
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Issue Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm"
                  placeholder="Brief summary of the issue"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                  <select 
                    value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm cursor-pointer"
                  >
                    <option value="General">General</option>
                    <option value="IT Support">IT Support</option>
                    <option value="HR">HR</option>
                    <option value="Facilities">Facilities</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailed Description</label>
                <textarea 
                  required rows="4"
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm resize-none"
                  placeholder="Please provide as much detail as possible..."
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 text-sm bg-accent-blue text-accent-text font-medium rounded-lg hover:bg-accent-indigo transition-colors shadow-sm flex items-center gap-2">
                  <TicketIcon size={16} /> Submit Ticket
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
