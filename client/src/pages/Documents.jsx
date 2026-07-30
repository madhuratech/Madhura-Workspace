import React, { useState, useEffect, useContext } from 'react';
import { FileText, Save, Search, Calendar, ChevronDown, RefreshCw, Plus, Edit2, Trash2, X, UploadCloud, File, FileCode, FileImage, Download } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const Documents = () => {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/documents');
      setDocuments(res.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({ title: item.title, content: item.content || '' });
    } else {
      setEditItem(null);
      setFormData({ title: '', content: '' });
      setFile(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
    setFile(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editItem) {
        // Update document (currently API only updates title/content, file update might need more logic)
        const res = await axios.put(`/documents/${editItem._id}`, formData);
        setDocuments(documents.map(d => d._id === editItem._id ? { ...d, ...res.data } : d));
      } else {
        // Create new document with file
        let fileUrl = '';
        let originalName = '';
        let mimeType = '';
        let size = 0;

        if (file) {
          const uploadData = new FormData();
          uploadData.append('file', file);
          const uploadRes = await axios.post('/upload', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          fileUrl = uploadRes.data.url;
          originalName = uploadRes.data.fileName;
          mimeType = uploadRes.data.fileType;
          size = file.size;
        }

        const res = await axios.post('/documents', {
          title: formData.title,
          content: formData.content,
          fileUrl,
          originalName,
          mimeType,
          size
        });
        
        // Add user info to new document to display correctly
        const newDoc = { ...res.data, author: { name: user.name, _id: user._id } };
        setDocuments([newDoc, ...documents]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`/documents/${id}`);
        setDocuments(documents.filter(d => d._id !== id));
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return <FileText className="text-gray-400" size={20} />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" size={20} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="text-blue-500" size={20} />;
    if (mimeType.includes('image')) return <FileImage className="text-green-500" size={20} />;
    return <File className="text-gray-500" size={20} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isSuperAdminOrHR = user?.role === 'super_admin' || user?.role === 'hr';

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">
            {isSuperAdminOrHR ? 'Document Management' : 'My Documents'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {isSuperAdminOrHR ? 'Manage and view all organizational documents' : 'Upload and manage your personal or team documents'}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex items-center space-x-2">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} onClick={fetchDocuments} />
             <span>Refresh</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2 shadow-lg shadow-blue-500/30"
          >
            <Plus size={16} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="overflow-x-auto flex-1">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left w-16">TYPE</th>
                <th className="text-left">TITLE / FILENAME</th>
                {isSuperAdminOrHR && <th className="text-left w-40">UPLOADED BY</th>}
                <th className="text-left w-32">SIZE</th>
                <th className="text-left w-40">DATE</th>
                <th className="text-right w-40">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id} className="hover:bg-bg-primary/50 transition-colors group">
                  <td className="text-center">{getFileIcon(doc.mimeType)}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary">{doc.title}</span>
                      {doc.originalName && <span className="text-xs text-text-secondary">{doc.originalName}</span>}
                    </div>
                  </td>
                  {isSuperAdminOrHR && (
                    <td className="text-text-secondary">
                      {doc.author?.name || 'Unknown'}
                    </td>
                  )}
                  <td className="text-text-secondary text-sm">{formatFileSize(doc.size)}</td>
                  <td className="text-text-secondary text-sm">{new Date(doc.createdAt).toLocaleDateString()}</td>
                  <td className="text-right space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.fileUrl && (
                       <a href={`${API_URL}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline text-sm font-medium inline-flex items-center">
                          <Download size={14} className="mr-1"/> View
                       </a>
                    )}
                    <button onClick={() => handleOpenModal(doc)} className="text-text-secondary hover:text-accent-blue text-sm font-medium"><Edit2 size={16}/></button>
                    {(isSuperAdminOrHR || doc.author?._id === user?._id || doc.author === user?._id) && (
                      <button onClick={() => handleDelete(doc._id)} className="text-text-secondary hover:text-danger text-sm font-medium"><Trash2 size={16}/></button>
                    )}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={isSuperAdminOrHR ? "6" : "5"} className="text-center py-16">
                     <div className="flex flex-col items-center justify-center text-text-secondary">
                       <UploadCloud size={48} className="mb-4 opacity-50" />
                       <p className="text-lg font-medium">No documents found</p>
                       <p className="text-sm mt-1">Upload a document to get started.</p>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-bg-secondary/95 backdrop-blur-xl border border-white/10 p-0 rounded-2xl w-full max-w-2xl shadow-[0_16px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-accent-blue/10 to-accent-indigo/10 px-6 py-5 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-1 flex items-center">
                  <UploadCloud className="mr-2 text-accent-blue" size={20} />
                  {editItem ? 'Edit Document' : 'Upload New Document'}
                </h3>
                <p className="text-xs text-text-secondary">Share files securely with your team.</p>
              </div>
              <button onClick={handleCloseModal} className="text-text-secondary hover:text-danger transition-colors bg-bg-primary/50 hover:bg-bg-primary p-2 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Document Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue"
                  placeholder="e.g., Q3 Marketing Strategy"
                />
              </div>

              {!editItem && (
                <div>
                   <label className="block text-sm font-medium text-text-secondary mb-1">File Attachment</label>
                   <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-lg hover:border-accent-blue transition-colors bg-bg-primary">
                     <div className="space-y-1 text-center">
                       <UploadCloud className="mx-auto h-12 w-12 text-text-secondary" />
                       <div className="flex text-sm text-text-secondary">
                         <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-accent-blue hover:text-blue-500 focus-within:outline-none">
                           <span>Upload a file</span>
                           <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" required={!editItem} />
                         </label>
                         <p className="pl-1">or drag and drop</p>
                       </div>
                       <p className="text-xs text-text-secondary">
                         PDF, DOCX, XLSX, PNG up to 32MB
                       </p>
                       {file && (
                         <p className="text-sm font-bold text-success mt-2">Selected: {file.name}</p>
                       )}
                     </div>
                   </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Description (Optional)</label>
                <textarea 
                  rows="3"
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-bg-primary border border-border rounded-lg px-4 py-2 text-text-primary focus:outline-none focus:border-accent-blue resize-none text-sm"
                  placeholder="Add some notes about this document..."
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-border/50">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-text-secondary hover:bg-bg-primary rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-gradient-to-r from-accent-blue to-accent-indigo text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shadow-lg shadow-accent-blue/20 flex items-center space-x-2"
                >
                  <Save size={16} /> <span>{editItem ? 'Save Changes' : 'Upload Document'}</span>
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
