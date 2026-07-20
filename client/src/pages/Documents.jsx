import React, { useState, useEffect } from 'react';
import { FileText, Save, Search, Calendar, ChevronDown, RefreshCw, Plus, Edit2, Trash2, X } from 'lucide-react';
import axios from 'axios';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  // Dummy data for now
  useEffect(() => {
    setDocuments([
      { id: '1', title: 'Q3 Marketing Strategy', content: 'Details...', createdBy: 'Alice', date: '2026-07-15' },
      { id: '2', title: 'API Documentation', content: 'Endpoints...', createdBy: 'Bob', date: '2026-07-18' }
    ]);
  }, []);

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({ title: item.title, content: item.content });
    } else {
      setEditItem(null);
      setFormData({ title: '', content: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editItem) {
      setDocuments(documents.map(d => d.id === editItem.id ? { ...d, title: formData.title, content: formData.content } : d));
    } else {
      setDocuments([...documents, {
        id: Date.now().toString(),
        title: formData.title,
        content: formData.content,
        createdBy: 'You',
        date: new Date().toISOString().split('T')[0]
      }]);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      setDocuments(documents.filter(d => d.id !== id));
    }
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary tracking-wide">Documents</h1>
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">
            Print
          </button>
          <button className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors text-sm font-medium">
            Export
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add New</span>
          </button>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto flex-1">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left w-24">ID</th>
                <th className="text-left">TITLE</th>
                <th className="text-left w-40">CREATED BY</th>
                <th className="text-left w-40">DATE</th>
                <th className="text-right w-40">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="text-text-secondary">#{doc.id.slice(-4)}</td>
                  <td className="font-bold text-text-primary">{doc.title}</td>
                  <td className="text-text-secondary">{doc.createdBy}</td>
                  <td className="text-text-secondary">{doc.date}</td>
                  <td className="text-right space-x-3">
                    <button onClick={() => handleOpenModal(doc)} className="text-accent-blue hover:underline text-sm font-medium">Edit</button>
                    <button onClick={() => handleDelete(doc.id)} className="text-danger hover:underline text-sm font-medium">Delete</button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-text-secondary">No documents found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-bg-secondary border border-border p-6 rounded-xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-text-primary">{editItem ? 'Edit Document' : 'New Document'}</h3>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-text-primary"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Content</label>
                <textarea 
                  required rows="10"
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue resize-none font-mono text-sm"
                ></textarea>
              </div>
              
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-text-secondary hover:text-text-primary font-medium">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-accent-blue text-white rounded-lg hover:bg-blue-600 font-medium transition-colors flex items-center space-x-2">
                  <Save size={16} /> <span>{editItem ? 'Save Changes' : 'Create'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
