import React, { useState, useEffect, useContext } from 'react';
import { FileText, Save, Search, RefreshCw, Plus, Edit2, Trash2, X, UploadCloud, File, FileCode, FileImage, Download, Folder, FolderOpen, History, Clock } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const FOLDER_COLORS = {
  'Employee Docs': 'bg-pink-100 text-pink-600 border-pink-200',
  'Project Files': 'bg-indigo-100 text-indigo-600 border-indigo-200',
  'General': 'bg-blue-100 text-blue-600 border-blue-200'
};

const FOLDER_ICONS = {
  'Employee Docs': 'pink',
  'Project Files': 'indigo',
  'General': 'blue'
};

const Documents = () => {
  const { user } = useContext(AuthContext);
  const [documents, setDocuments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [historyItem, setHistoryItem] = useState(null);
  
  const [formData, setFormData] = useState({ title: '', content: '', folderType: 'General' });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFolder, setActiveFolder] = useState(null);
  
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

  const availableFolders = Array.from(new Set(documents.map(d => d.folderType || 'General')));
  // If empty, define default folders based on role so UI isn't empty
  if (availableFolders.length === 0) {
    if (user?.role === 'hr' || user?.role === 'super_admin') availableFolders.push('Employee Docs');
    if (user?.role === 'team_leader' || user?.role === 'super_admin') availableFolders.push('Project Files');
    availableFolders.push('General');
  }

  const filteredDocs = activeFolder ? documents.filter(d => (d.folderType || 'General') === activeFolder) : documents;

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditItem(item);
      setFormData({ title: item.title, content: item.content || '', folderType: item.folderType || 'General' });
    } else {
      setEditItem(null);
      setFormData({ title: '', content: '', folderType: activeFolder || 'General' });
      setFile(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditItem(null);
    setFile(null);
  };

  const handleOpenHistory = (item) => {
    setHistoryItem(item);
    setIsHistoryModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
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

      if (editItem) {
        const payload = { ...formData };
        if (fileUrl) {
          payload.fileUrl = fileUrl;
          payload.originalName = originalName;
          payload.mimeType = mimeType;
          payload.size = size;
        }
        const res = await axios.put(`/documents/${editItem._id}`, payload);
        setDocuments(documents.map(d => d._id === editItem._id ? { ...d, ...res.data } : d));
      } else {
        const res = await axios.post('/documents', {
          ...formData,
          fileUrl,
          originalName,
          mimeType,
          size
        });
        setDocuments([res.data, ...documents]);
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
    <div className="h-full flex flex-col font-sans max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">
            {isSuperAdminOrHR ? 'Document Management' : 'My Documents'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Replace Google Drive: Folders, Role-based access, and Version history.
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex items-center space-x-2 bg-white shadow-sm">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} onClick={fetchDocuments} />
             <span>Sync</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2 shadow-lg shadow-blue-500/30"
          >
            <Plus size={16} />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Folders Section */}
      <div className="mb-8">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center justify-between">
          <span>Folders</span>
          {activeFolder && (
            <button onClick={() => setActiveFolder(null)} className="text-accent-blue normal-case font-medium hover:underline text-xs">View All Files</button>
          )}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {availableFolders.map((folder) => {
            const docCount = documents.filter(d => (d.folderType || 'General') === folder).length;
            const colorClass = FOLDER_COLORS[folder] || FOLDER_COLORS['General'];
            const isActive = activeFolder === folder;
            
            return (
              <div 
                key={folder}
                onClick={() => setActiveFolder(isActive ? null : folder)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 group ${isActive ? 'bg-blue-50/50 border-accent-blue shadow-md shadow-blue-500/10' : 'bg-white border-border hover:border-gray-300 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl border ${colorClass}`}>
                    {isActive ? <FolderOpen size={24} /> : <Folder size={24} />}
                  </div>
                </div>
                <h3 className={`font-semibold text-base mb-1 ${isActive ? 'text-accent-blue' : 'text-text-primary group-hover:text-accent-blue transition-colors'}`}>{folder}</h3>
                <p className="text-sm text-text-secondary font-medium">{docCount} files</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Files Section */}
      <div className="bg-white border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border flex justify-between items-center bg-gray-50/50">
          <h2 className="font-bold text-text-primary flex items-center gap-2">
            {activeFolder ? <FolderOpen size={18} className="text-accent-blue"/> : <FileText size={18} className="text-accent-blue"/>}
            {activeFolder ? `${activeFolder} Files` : 'All Files'}
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search files..." 
              className="pl-9 pr-4 py-1.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue/20 w-64"
            />
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
             <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-text-secondary py-20">
               <UploadCloud size={64} className="mb-4 text-gray-300" />
               <p className="text-lg font-medium text-gray-800">This folder is empty</p>
               <p className="text-sm mt-1 text-gray-500">Upload a document to {activeFolder || 'get started'}.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredDocs.map((doc) => (
                <div key={doc._id} className="bg-white border border-border hover:border-gray-300 rounded-xl p-4 transition-all group shadow-sm flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                      {getFileIcon(doc.mimeType)}
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.versionHistory?.length > 1 && (
                         <button onClick={(e) => { e.stopPropagation(); handleOpenHistory(doc); }} className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-blue-50 rounded-md" title="Version History">
                           <History size={16} />
                         </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleOpenModal(doc); }} className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-blue-50 rounded-md">
                        <Edit2 size={16} />
                      </button>
                      {(isSuperAdminOrHR || doc.author?._id === user?._id || doc.author === user?._id) && (
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(doc._id); }} className="p-1.5 text-gray-400 hover:text-danger hover:bg-red-50 rounded-md">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">{doc.title}</h3>
                  {doc.originalName && <p className="text-xs text-gray-500 line-clamp-1 mb-3">{doc.originalName}</p>}
                  
                  <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                    <span className="truncate pr-2">{doc.author?.name || 'Unknown'}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatFileSize(doc.size)}</span>
                      {doc.fileUrl && (
                        <a href={`${API_URL}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:bg-blue-50 p-1 rounded transition-colors ml-1" title="Download/View">
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UploadCloud className="text-accent-blue" size={20} />
                {editItem ? (file ? 'Upload New Version' : 'Edit Document Details') : 'Upload Document'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 font-bold p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  placeholder="e.g., Q3 Marketing Strategy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                <select 
                  className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-blue/20"
                  value={formData.folderType}
                  onChange={e => setFormData({...formData, folderType: e.target.value})}
                  disabled={!isSuperAdminOrHR && user?.role !== 'team_leader'}
                >
                  {(isSuperAdminOrHR || user?.role === 'hr') && <option value="Employee Docs">Employee Docs</option>}
                  {(isSuperAdminOrHR || user?.role === 'team_leader') && <option value="Project Files">Project Files</option>}
                  <option value="General">General</option>
                </select>
                {(!isSuperAdminOrHR && user?.role !== 'team_leader') && (
                  <p className="text-xs text-gray-500 mt-1">You only have permission to upload to General.</p>
                )}
              </div>

              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">{editItem ? 'Update File (Optional for new version)' : 'File Attachment'}</label>
                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-border border-dashed rounded-xl hover:border-accent-blue transition-colors bg-gray-50">
                   <div className="space-y-1 text-center">
                     <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                     <div className="flex justify-center text-sm text-gray-600">
                       <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-accent-blue hover:text-blue-500 focus-within:outline-none">
                         <span>Upload a file</span>
                         <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} required={!editItem} />
                       </label>
                       <p className="pl-1">or drag and drop</p>
                     </div>
                     <p className="text-xs text-gray-500">
                       Any file type up to 32MB
                     </p>
                     {file && (
                       <p className="text-sm font-bold text-green-600 mt-2 bg-green-50 px-3 py-1 rounded-full inline-block">Selected: {file.name}</p>
                     )}
                   </div>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  rows="2"
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-white border border-border rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-accent-blue/20 resize-none"
                  placeholder="Notes about this file..."
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 border border-border text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2.5 bg-accent-blue text-white font-medium rounded-xl hover:bg-blue-600 transition-colors shadow-sm flex items-center gap-2">
                  <Save size={18} /> {editItem ? 'Save & Upload Version' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && historyItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="text-accent-blue" size={20} />
                Version History
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-white overflow-y-auto max-h-[60vh]">
              <h4 className="font-semibold text-gray-900 mb-4">{historyItem.title}</h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {historyItem.versionHistory && historyItem.versionHistory.slice().reverse().map((ver, idx) => (
                  <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-[.is-active]:bg-blue-50 text-slate-500 group-[.is-active]:text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Clock size={16} />
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-slate-900 text-sm">Version {historyItem.versionHistory.length - idx}</div>
                        <time className="font-caveat font-medium text-indigo-500 text-xs">{new Date(ver.updatedAt).toLocaleDateString()}</time>
                      </div>
                      <div className="text-slate-500 text-xs flex justify-between items-center">
                        <span className="truncate max-w-[150px]">{ver.originalName}</span>
                        <a href={`${API_URL}${ver.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">Download</a>
                      </div>
                      <div className="mt-2 text-xs text-gray-400">By: {ver.updatedBy?.name || 'Unknown'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
