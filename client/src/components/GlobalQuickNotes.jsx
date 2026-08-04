import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { X } from 'lucide-react';

const GlobalQuickNotes = ({ onClose }) => {
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [workspace, setWorkspace] = useState(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#fde68a');
  
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 80 });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  
  useEffect(() => {
    axios.get('/workspaces').then(res => {
      if (res.data.length > 0) setWorkspace(res.data[0]);
    });
  }, []);
  
  const handleMouseDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e) => {
    if (!draggingRef.current) return;
    setPosition({
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y
    });
  };

  const handleMouseUp = () => {
    draggingRef.current = false;
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const saveNote = async () => {
    if (!title.trim() && !content.trim()) return;
    if (!workspace) return;
    try {
      await axios.post(`/workspaces/${workspace._id}/notes`, { title, content, color, isPinned: false });
      showToast('Quick Note saved', 'success');
      setTitle('');
      setContent('');
      // We purposefully don't close it so they can keep jotting notes like a real scratchpad
    } catch(err) {
      showToast('Failed to save', 'error');
    }
  };

  return (
    <div 
      style={{ left: position.x, top: position.y, backgroundColor: color }}
      className="fixed z-[9999] w-72 rounded-xl shadow-2xl border border-black/10 overflow-hidden flex flex-col"
    >
      <div 
        onMouseDown={handleMouseDown} 
        className="h-8 bg-black/5 cursor-move flex justify-between items-center px-2 select-none"
      >
        <span className="text-xs font-semibold text-gray-700 ml-1">Scratchpad</span>
        <button onClick={onClose} className="no-drag p-1 rounded-md hover:bg-black/10 text-gray-700">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 flex flex-col no-drag">
        <input 
          value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="Title"
          className="bg-transparent border-none outline-none font-semibold text-gray-800 mb-2 placeholder-gray-600"
        />
        <textarea 
          value={content} onChange={e=>setContent(e.target.value)}
          placeholder="Jot down something quick..."
          className="bg-transparent border-none outline-none text-gray-800 resize-none min-h-[120px] text-sm placeholder-gray-600"
        />
      </div>
      <div className="bg-black/5 px-3 py-2 flex justify-between items-center no-drag">
        <div className="flex space-x-1">
          {['#ffffff', '#fecaca', '#fde68a', '#bbf7d0', '#bfdbfe'].map(c => (
             <button 
               key={c} onClick={() => setColor(c)}
               className={`w-4 h-4 rounded-full border border-black/10 ${color === c ? 'ring-2 ring-blue-500' : ''}`}
               style={{backgroundColor: c}}
             />
          ))}
        </div>
        <button onClick={saveNote} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 shadow-sm">
          Save
        </button>
      </div>
    </div>
  );
};
export default GlobalQuickNotes;
