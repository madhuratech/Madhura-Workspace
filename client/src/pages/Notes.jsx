import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Plus, Image as ImageIcon, X, Trash2, Edit2, Pin, Search } from 'lucide-react';

const COLORS = [
  '#ffffff', // White
  '#fecaca', // Red
  '#fde68a', // Yellow
  '#bbf7d0', // Green
  '#bfdbfe', // Blue
  '#e9d5ff', // Purple
  '#fbcfe8', // Pink
];

const Notes = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [workspace, setWorkspace] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Note Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [isPinned, setIsPinned] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchWorkspaceAndNotes();
  }, []);

  const fetchWorkspaceAndNotes = async () => {
    try {
      const wsRes = await axios.get('/workspaces');
      if (wsRes.data.length > 0) {
        const ws = wsRes.data[0];
        setWorkspace(ws);
        const notesRes = await axios.get(`/workspaces/${ws._id}/notes`);
        setNotes(notesRes.data);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (note = null) => {
    if (note) {
      setEditingNoteId(note._id);
      setTitle(note.title);
      setContent(note.content);
      setColor(note.color);
      setIsPinned(note.isPinned);
    } else {
      setEditingNoteId(null);
      setTitle('');
      setContent('');
      setColor('#ffffff');
      setIsPinned(false);
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingNoteId(null);
  };

  const saveNote = async () => {
    if (!title.trim() && !content.trim()) {
      closeForm();
      return;
    }
    
    try {
      const payload = { title, content, color, isPinned };
      
      if (editingNoteId) {
        const res = await axios.put(`/workspaces/${workspace._id}/notes/${editingNoteId}`, payload);
        setNotes(prev => prev.map(n => n._id === editingNoteId ? res.data : n));
        showToast('Note updated', 'success');
      } else {
        const res = await axios.post(`/workspaces/${workspace._id}/notes`, payload);
        setNotes([res.data, ...notes]);
        showToast('Note created', 'success');
      }
      closeForm();
    } catch (err) {
      console.error(err);
      showToast('Error saving note', 'error');
    }
  };

  const deleteNote = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this note?')) return;
    
    try {
      await axios.delete(`/workspaces/${workspace._id}/notes/${id}`);
      setNotes(prev => prev.filter(n => n._id !== id));
      showToast('Note deleted', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error deleting note', 'error');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !workspace) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const uploadRes = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const attachment = {
        url: uploadRes.data.url,
        fileName: file.name,
        fileType: file.type
      };
      
      // If we are editing, update the note immediately
      if (editingNoteId) {
        const res = await axios.put(`/workspaces/${workspace._id}/notes/${editingNoteId}`, { attachment });
        setNotes(prev => prev.map(n => n._id === editingNoteId ? res.data : n));
        showToast('Image attached', 'success');
      } else {
        // If creating a new note, create it right away with the image
        const payload = { title, content, color, isPinned, attachment };
        const res = await axios.post(`/workspaces/${workspace._id}/notes`, payload);
        setNotes([res.data, ...notes]);
        openForm(res.data); // Keep form open to continue editing
        showToast('Image attached', 'success');
      }
    } catch (err) {
      console.error('Upload error', err);
      showToast('Image upload failed', 'error');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const togglePin = async (id, currentStatus, e) => {
    e.stopPropagation();
    try {
      const res = await axios.put(`/workspaces/${workspace._id}/notes/${id}`, { isPinned: !currentStatus });
      setNotes(prev => prev.map(n => n._id === id ? res.data : n).sort((a, b) => b.isPinned - a.isPinned));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Quick Notes</h1>
          <p className="text-text-secondary text-sm mt-1">Your personal scratchpad for ideas and screenshots.</p>
        </div>
        <button 
          onClick={() => openForm()}
          className="bg-accent-blue text-white px-4 py-2 rounded-lg flex items-center space-x-2 shadow-lg shadow-accent-blue/30 hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} />
          <span>New Note</span>
        </button>
      </div>
      
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 text-text-secondary" size={18} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            className="w-full bg-bg-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
          />
        </div>
      </div>

      {/* Note Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-bg-primary rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95" style={{ backgroundColor: color }}>
            <div className="p-4 flex flex-col">
              <input 
                type="text" 
                placeholder="Title" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="text-xl font-semibold bg-transparent border-none focus:outline-none text-gray-800 placeholder-gray-500 mb-2"
                autoFocus
              />
              <textarea 
                placeholder="Take a note..." 
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none resize-none text-gray-800 placeholder-gray-500 min-h-[150px]"
              />
              
              {/* Attachments preview */}
              {editingNoteId && notes.find(n => n._id === editingNoteId)?.attachments?.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {notes.find(n => n._id === editingNoteId).attachments.map((att, i) => (
                    <div key={i} className="relative rounded-lg overflow-hidden border border-black/10">
                      <img src={att.url} alt="Attachment" className="w-full h-auto object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-4 py-3 bg-black/5 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  {COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border border-black/10 ${color === c ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                
                <button 
                  onClick={() => setIsPinned(!isPinned)}
                  className={`p-1.5 rounded-full ${isPinned ? 'text-blue-600 bg-blue-100' : 'text-gray-500 hover:bg-black/5'}`}
                  title="Pin Note"
                >
                  <Pin size={18} />
                </button>
                
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-gray-500 hover:bg-black/5 rounded-full relative"
                  title="Add Image"
                >
                  <ImageIcon size={18} />
                  {uploadingImage && <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button onClick={closeForm} className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-black/5 rounded-lg">Close</button>
                <button onClick={saveNote} className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Masonry Grid */}
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
        {notes.map(note => (
          <div 
            key={note._id} 
            onClick={() => openForm(note)}
            className="break-inside-avoid rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow group relative border border-black/5"
            style={{ backgroundColor: note.color }}
          >
            {/* Quick Actions (Hover) */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
              <button 
                onClick={(e) => togglePin(note._id, note.isPinned, e)}
                className={`p-1.5 rounded-full bg-white/50 hover:bg-white ${note.isPinned ? 'text-blue-600' : 'text-gray-600'}`}
              >
                <Pin size={14} />
              </button>
              <button 
                onClick={(e) => deleteNote(note._id, e)}
                className="p-1.5 rounded-full bg-white/50 hover:bg-white text-red-600"
              >
                <Trash2 size={14} />
              </button>
            </div>
            
            {note.attachments && note.attachments.length > 0 && (
              <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl">
                <img src={note.attachments[0].url} alt="Cover" className="w-full object-cover max-h-48" />
              </div>
            )}
            
            {note.title && <h3 className="font-semibold text-gray-800 mb-2 text-lg leading-tight">{note.title}</h3>}
            {note.content && <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{note.content}</p>}
            
            <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center text-[10px] text-gray-500 font-medium">
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
              {note.isPinned && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Pinned</span>}
            </div>
          </div>
        ))}
      </div>
      
      {notes.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-accent-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Edit2 size={32} className="text-accent-blue" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">No notes yet</h2>
          <p className="text-text-secondary mb-6">Capture ideas, save screenshots, and organize your thoughts.</p>
          <button 
            onClick={() => openForm()}
            className="text-accent-blue font-semibold hover:underline"
          >
            Create your first note
          </button>
        </div>
      )}
    </div>
  );
};

export default Notes;
