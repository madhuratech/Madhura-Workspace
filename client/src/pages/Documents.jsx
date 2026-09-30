import React, { useState, useEffect, useContext } from 'react';
import { FileText, Save, Search, RefreshCw, Plus, Edit2, Trash2, X, UploadCloud, File, FileImage, Download, Folder, FolderOpen, History, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Avatar from '../components/Avatar';



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
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
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

  let filteredDocs = [...documents];
  
  if (searchTerm) {
    filteredDocs = filteredDocs.filter(d => 
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (d.originalName && d.originalName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage);
  // Ensure current page is valid after filtering
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const currentDocs = filteredDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    if (!mimeType) return <FileText className="text-gray-400" size={18} />;
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" size={18} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="text-blue-500" size={18} />;
    if (mimeType.includes('image')) return <FileImage className="text-green-500" size={18} />;
    return <File className="text-gray-500" size={18} />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isSuperAdminOrHR = user?.role === 'super_admin' || user?.role === 'hr';

  return (
    <div className="h-full flex flex-col font-sans w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-wide">
            {isSuperAdminOrHR ? 'Document Management' : 'My Documents'}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Secure files with role-based folders and version history.
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 rounded-lg border border-border text-text-secondary hover:text-text-primary transition-colors text-sm font-medium flex items-center space-x-2 bg-white shadow-sm">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} onClick={fetchDocuments} />
             <span>Sync</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-accent-blue text-accent-text px-4 py-2 rounded-lg hover:bg-accent-indigo transition-colors text-sm font-medium flex items-center space-x-2 shadow-sm"
          >
            <Plus size={16} />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Files Section - Table */}
      <div className="bg-white border border-border rounded-xl flex-1 flex flex-col shadow-sm overflow-hidden mt-6">
        <div className="px-5 py-4 flex justify-between items-center border-b border-border">
          <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <FileText size={20} className="text-accent-blue"/>
            All Files
          </h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue w-72 transition-colors"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
             <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div></div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-text-secondary py-20">
               <UploadCloud size={56} className="mb-4 text-gray-300" />
               <p className="text-lg font-medium text-gray-800">No documents found</p>
               <p className="text-sm mt-1 text-gray-500">{searchTerm ? 'Try adjusting your search' : 'Upload a document to get started.'}</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-5 font-medium text-xs text-gray-500 uppercase tracking-wider">File Name</th>
                  <th className="py-3 px-5 font-medium text-xs text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="py-3 px-5 font-medium text-xs text-gray-500 uppercase tracking-wider">Uploaded By</th>
                  <th className="py-3 px-5 font-medium text-xs text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-5 font-medium text-xs text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentDocs.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm flex-shrink-0">
                          {getFileIcon(doc.mimeType)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{doc.title}</p>
                          {doc.originalName && <p className="text-xs text-gray-500 truncate max-w-[200px]">{doc.originalName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-600 font-medium">
                      {formatFileSize(doc.size)}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <Avatar user={doc.author} size="w-6 h-6" textClass="text-xs" showStatus={false} />
                        <span className="text-sm text-gray-700">{doc.author?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-sm text-gray-500">
                      {( doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : "N/A" )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        {doc.fileUrl && (
                          <a href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${API_URL}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-blue-50 rounded-md" title="Download">
                            <Download size={18} />
                          </a>
                        )}
                        {doc.versionHistory?.length > 1 && (
                           <button onClick={() => handleOpenHistory(doc)} className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-blue-50 rounded-md" title="Version History">
                             <History size={18} />
                           </button>
                        )}
                        <button onClick={() => handleOpenModal(doc)} className="p-1.5 text-gray-400 hover:text-accent-blue hover:bg-blue-50 rounded-md" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        {(isSuperAdminOrHR || doc.author?._id === user?._id || doc.author === user?._id) && (
                          <button onClick={() => handleDelete(doc._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredDocs.length > 0 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between bg-white">
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, filteredDocs.length)}</span> of <span className="font-semibold text-gray-900">{filteredDocs.length}</span> results
            </p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-3 py-1 text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <UploadCloud className="text-accent-blue" size={20} />
                {editItem ? (file ? 'Upload New Version' : 'Edit Document Details') : 'Upload Document'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Document Title</label>
                  <input 
                    type="text" required 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm"
                    placeholder="e.g., Q3 Marketing Strategy"
                  />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">{editItem ? 'Update File (Optional for new version)' : 'File Attachment'}</label>
                 <div className="mt-1 flex justify-center px-4 pt-4 pb-5 border-2 border-dashed border-gray-300 rounded-xl hover:border-accent-blue hover:bg-blue-50/50 transition-colors bg-gray-50 cursor-pointer group">
                   <div className="space-y-1 text-center">
                     <UploadCloud className="mx-auto h-10 w-10 text-gray-400 group-hover:text-accent-blue transition-colors" />
                     <div className="flex justify-center text-sm text-gray-600">
                       <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-accent-blue hover:text-blue-500 focus-within:outline-none">
                         <span>Upload a file</span>
                         <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} required={!editItem} />
                       </label>
                       <p className="pl-1">or drag and drop</p>
                     </div>
                     <p className="text-xs text-gray-400">
                       Any file type up to 32MB
                     </p>
                     {file && (
                       <p className="text-xs font-bold text-green-700 mt-2 bg-green-100 px-3 py-1 rounded-md inline-block max-w-[250px] truncate">{file.name}</p>
                     )}
                   </div>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea 
                  rows="2"
                  value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-accent-blue focus:border-accent-blue transition-colors shadow-sm resize-none"
                  placeholder="Notes about this file..."
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 text-sm bg-accent-blue text-accent-text font-medium rounded-lg hover:bg-accent-indigo transition-colors shadow-sm flex items-center gap-2">
                  <Save size={16} /> {editItem ? 'Save Version' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {isHistoryModalOpen && historyItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <History className="text-accent-blue" size={20} />
                Version History
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 bg-white overflow-y-auto max-h-[60vh]">
              <h4 className="font-semibold text-gray-900 mb-4">{historyItem.title}</h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-4 md:before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                {historyItem.versionHistory && historyItem.versionHistory.slice().reverse().map((ver, idx) => (
                  <div key={idx} className="relative flex items-center justify-between group">
                    <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border border-white bg-gray-100 group-hover:bg-blue-50 text-gray-500 group-hover:text-accent-blue shadow-sm shrink-0 z-10">
                      <Clock size={16} />
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(100%-3.5rem)] p-3.5 rounded-xl border border-gray-200 bg-white shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex items-center justify-between space-x-2 mb-1">
                        <div className="font-bold text-gray-900 text-sm">Version {historyItem.versionHistory.length - idx}</div>
                        <time className="font-medium text-gray-400 text-xs">{new Date(ver.updatedAt).toLocaleDateString()}</time>
                      </div>
                      <div className="text-gray-500 text-xs flex justify-between items-center">
                        <span className="truncate max-w-[150px] font-medium" title={ver.originalName}>{ver.originalName}</span>
                        <a href={ver.fileUrl.startsWith('http') ? ver.fileUrl : `${API_URL}${ver.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline font-semibold flex items-center gap-1">
                          <Download size={12}/> Get
                        </a>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400 flex items-center gap-1.5">
                        <Avatar user={ver.updatedBy} size="w-4 h-4" textClass="text-[8px]" showStatus={false} />
                        By {ver.updatedBy?.name || 'Unknown'}
                      </div>
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
