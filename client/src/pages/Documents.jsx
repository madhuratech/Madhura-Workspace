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
    <div className="h-full flex flex-col font-sans animate-fade-in bg-bg-primary">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4 px-2">
        <div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            {isSuperAdminOrHR ? 'Organization Files' : 'My Files'}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-1">
            {isSuperAdminOrHR ? 'Manage and organize company-wide documents securely' : 'Store, share, and collaborate on your documents'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 items-center">
          {/* Mock Search Bar for premium feel */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/60" size={16} />
            <input 
              type="text" 
              placeholder="Search files..."
              className="w-full bg-bg-secondary border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue/50 focus:ring-2 focus:ring-accent-blue/20 transition-all shadow-sm"
            />
          </div>
          
          <button onClick={fetchDocuments} className="hidden sm:flex px-4 py-2.5 rounded-xl border border-border bg-bg-secondary hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-all text-sm font-bold items-center space-x-2 shadow-sm hover:shadow-md">
             <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={() => handleOpenModal()}
            className="w-full sm:w-auto bg-accent-blue text-white px-5 py-2.5 rounded-xl hover:bg-blue-600 transition-all text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-accent-blue/30 hover:-translate-y-0.5"
          >
            <Plus size={18} />
            <span>New Upload</span>
          </button>
        </div>
      </div>

      {/* Main Files Table */}
      <div className="flex-1 bg-bg-secondary/50 backdrop-blur-xl border border-border/60 rounded-3xl overflow-hidden shadow-xl shadow-black/5 flex flex-col">
        <div className="overflow-x-auto flex-1 custom-scrollbar p-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-border/60">
                <th className="font-extrabold text-[11px] uppercase tracking-widest text-text-secondary py-4 pl-8 w-16 text-center">Type</th>
                <th className="font-extrabold text-[11px] uppercase tracking-widest text-text-secondary py-4 px-4">Name</th>
                {isSuperAdminOrHR && <th className="font-extrabold text-[11px] uppercase tracking-widest text-text-secondary py-4 px-4 w-48">Owner</th>}
                <th className="font-extrabold text-[11px] uppercase tracking-widest text-text-secondary py-4 px-4 w-32">Size</th>
                <th className="font-extrabold text-[11px] uppercase tracking-widest text-text-secondary py-4 px-4 w-40">Modified</th>
                <th className="font-extrabold text-[11px] uppercase tracking-widest text-text-secondary py-4 pr-8 text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {documents.map((doc) => (
                <tr key={doc._id} className="hover:bg-bg-primary/80 transition-colors group">
                  <td className="py-4 pl-8 text-center flex justify-center items-center h-full">
                    <div className="p-2.5 bg-bg-primary rounded-xl shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                      {getFileIcon(doc.mimeType)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary text-sm group-hover:text-accent-blue transition-colors cursor-pointer">{doc.title}</span>
                      {doc.originalName && <span className="text-xs font-medium text-text-secondary/70 mt-0.5 truncate max-w-xs">{doc.originalName}</span>}
                    </div>
                  </td>
                  {isSuperAdminOrHR && (
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-full bg-accent-blue/10 flex items-center justify-center text-accent-blue font-bold text-[10px]">
                           {doc.author?.name ? doc.author.name.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <span className="text-sm font-medium text-text-secondary">{doc.author?.name || 'Unknown'}</span>
                      </div>
                    </td>
                  )}
                  <td className="py-4 px-4 text-text-secondary font-medium text-xs">{formatFileSize(doc.size)}</td>
                  <td className="py-4 px-4 text-text-secondary font-medium text-xs">{new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                  <td className="py-4 pr-8 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-200">
                      {doc.fileUrl && (
                         <a href={`${API_URL}${doc.fileUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-bg-primary rounded-lg text-text-secondary hover:text-accent-blue hover:shadow-md transition-all border border-border/50" title="View/Download">
                            <Download size={16} />
                         </a>
                      )}
                      <button onClick={() => handleOpenModal(doc)} className="p-2 bg-bg-primary rounded-lg text-text-secondary hover:text-emerald-500 hover:shadow-md transition-all border border-border/50" title="Edit Properties">
                        <Edit2 size={16}/>
                      </button>
                      {(isSuperAdminOrHR || doc.author?._id === user?._id || doc.author === user?._id) && (
                        <button onClick={() => handleDelete(doc._id)} className="p-2 bg-bg-primary rounded-lg text-text-secondary hover:text-danger hover:shadow-md transition-all border border-border/50" title="Delete">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={isSuperAdminOrHR ? "6" : "5"} className="py-24">
                     <div className="flex flex-col items-center justify-center text-text-secondary text-center">
                       <div className="w-20 h-20 bg-bg-primary rounded-full flex items-center justify-center mb-4 shadow-inner border border-border/50">
                         <UploadCloud size={36} className="text-accent-blue/50" />
                       </div>
                       <h3 className="text-xl font-extrabold text-text-primary">No files here yet</h3>
                       <p className="text-sm font-medium mt-2 max-w-sm">Upload documents, spreadsheets, and presentations to share with your team.</p>
                       <button onClick={() => handleOpenModal()} className="mt-6 px-6 py-2.5 bg-accent-blue/10 text-accent-blue font-bold rounded-xl hover:bg-accent-blue/20 transition-colors">
                         Upload First File
                       </button>
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal (Premium Design) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-bg-secondary border border-border/60 p-1 rounded-3xl w-full max-w-lg shadow-2xl shadow-black/40 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent-blue/10 to-transparent pointer-events-none"></div>
            
            <div className="bg-bg-primary rounded-[22px] p-6 sm:p-8 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-text-primary tracking-tight">
                    {editItem ? 'Edit Details' : 'Upload File'}
                  </h3>
                  <p className="text-sm font-medium text-text-secondary mt-1">
                    {editItem ? 'Update document metadata' : 'Add a new file to the workspace'}
                  </p>
                </div>
                <button onClick={handleCloseModal} className="p-2 bg-bg-secondary rounded-full text-text-secondary hover:text-text-primary hover:bg-border transition-all shadow-sm">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 ml-1">Name</label>
                  <input 
                    type="text" required 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-bg-secondary border-2 border-border/50 rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:outline-none focus:border-accent-blue/80 transition-colors placeholder:font-normal"
                    placeholder="e.g., Q3 Marketing Strategy"
                  />
                </div>

                {!editItem && (
                  <div>
                     <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 ml-1">Attachment</label>
                     <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-border/50 border-dashed rounded-xl hover:border-accent-blue hover:bg-accent-blue/5 transition-all bg-bg-secondary group relative">
                       <input id="file-upload" name="file-upload" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" required={!editItem} />
                       
                       <div className="space-y-2 text-center pointer-events-none">
                         <div className="w-14 h-14 bg-bg-primary rounded-full flex items-center justify-center mx-auto shadow-sm border border-border/50 group-hover:scale-110 transition-transform">
                           <UploadCloud className="h-7 w-7 text-accent-blue" />
                         </div>
                         <div className="flex flex-col text-sm text-text-secondary mt-4">
                           <span className="font-bold text-accent-blue text-base">Click to browse</span>
                           <span className="text-xs mt-1">or drag and drop your file here</span>
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 mt-4">
                           PDF, DOCX, XLSX, PNG (Max 32MB)
                         </p>
                       </div>
                     </div>
                     {file && (
                       <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center space-x-3">
                         <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-500">
                           <File size={16} />
                         </div>
                         <p className="text-sm font-bold text-text-primary truncate flex-1">{file.name}</p>
                         <p className="text-xs font-bold text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded">Ready</p>
                       </div>
                     )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1.5 ml-1">Notes (Optional)</label>
                  <textarea 
                    rows="3"
                    value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
                    className="w-full bg-bg-secondary border-2 border-border/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-blue/80 transition-colors resize-none"
                    placeholder="Add brief description..."
                  ></textarea>
                </div>
                
                <div className="pt-6 flex justify-end space-x-3">
                  <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl font-bold text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-accent-blue text-white rounded-xl hover:bg-blue-600 font-bold transition-all flex items-center space-x-2 shadow-lg shadow-accent-blue/30 hover:-translate-y-0.5">
                    {loading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>{editItem ? 'Save Changes' : 'Upload Now'}</span>
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
