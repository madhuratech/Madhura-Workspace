import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import AnimatedLoader from '../components/AnimatedLoader';
import { Camera, Mail, Shield, User as UserIcon, X, Check } from 'lucide-react';
import Avatar from '../components/Avatar';
import Cropper from 'react-easy-crop';

// ── Teams-style status config (shared definition) ──
const TEAMS_STATUSES = [
  {
    key: 'Active', label: 'Available',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#92C353" stroke="#92C353" /><path d="M4.5 8.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dotColor: '#92C353',
  },
  {
    key: 'Busy', label: 'Busy',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" /><circle cx="8" cy="8" r="3" fill="white" /></svg>,
    dotColor: '#C4314B',
  },
  {
    key: 'Break', label: 'Do not disturb',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#C4314B" stroke="#C4314B" /><rect x="4" y="7" width="8" height="2" rx="1" fill="white" /></svg>,
    dotColor: '#C4314B',
  },
  {
    key: 'Lunch', label: 'Be right back',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" /><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dotColor: '#F8B739',
  },
  {
    key: 'Away', label: 'Appear away',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="#F8B739" stroke="#F8B739" /><path d="M8 4.5v3.75l2.25 2.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    dotColor: '#F8B739',
  },
  {
    key: 'Leave', label: 'Appear offline',
    icon: <svg viewBox="0 0 16 16" fill="none" style={{ width: 14, height: 14, flexShrink: 0 }}><circle cx="8" cy="8" r="7.5" fill="none" stroke="#8A8886" strokeWidth="1.5" /><circle cx="8" cy="8" r="4" fill="#8A8886" /><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="white" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    dotColor: '#8A8886',
  },
];

const getStatusDef = (key) => TEAMS_STATUSES.find(s => s.key === key) || TEAMS_STATUSES[0];

// Inline Teams-style status badge
const StatusBadge = ({ status }) => {
  const def = getStatusDef(status);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: `${def.dotColor}18`,
      border: `1px solid ${def.dotColor}40`,
      fontSize: 12, fontWeight: 600, color: def.dotColor,
    }}>
      {def.icon}
      {def.label}
    </span>
  );
};

// Helper function to create the cropped image
const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  
  return canvas.toDataURL('image/jpeg', 0.9);
};

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser, setUser } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Crop Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfileUser();
  }, [id]);

  const fetchProfileUser = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/users/${id}`);
      setProfileUser(res.data);
    } catch (error) {
      console.error(error);
      showToast('Error loading profile', 'error');
      navigate(-1); // Go back if error
    } finally {
      setLoading(false);
    }
  };

  const isOwnProfile = currentUser?._id === id;

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setIsCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const saveCroppedImage = async () => {
    try {
      const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const res = await axios.put('/users/avatar', { avatar: croppedImageBase64 });
      setProfileUser(res.data);
      showToast('Profile picture updated!', 'success');
      
      // Update global context so header avatar updates immediately
      const updatedCurrentUser = { ...currentUser, avatar: res.data.avatar };
      setUser(updatedCurrentUser);
      localStorage.setItem('user', JSON.stringify(updatedCurrentUser));
      
      setIsCropModalOpen(false);
    } catch (e) {
      console.error(e);
      showToast('Error saving profile picture', 'error');
    }
  };

  const removeAvatar = async () => {
    if (!window.confirm('Remove profile picture?')) return;
    try {
      const res = await axios.put('/users/avatar', { avatar: '' });
      setProfileUser(res.data);
      showToast('Profile picture removed!', 'success');
      const updatedCurrentUser = { ...currentUser, avatar: '' };
      setUser(updatedCurrentUser);
      localStorage.setItem('user', JSON.stringify(updatedCurrentUser));
    } catch (e) {
      showToast('Error removing profile picture', 'error');
    }
  };

  if (loading || !profileUser) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-bg-primary animate-fade-in">
        <AnimatedLoader />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col font-sans p-6 bg-bg-primary overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        
        {/* Profile Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Cover Photo Area */}
          <div className="h-32 bg-gradient-to-r from-accent-blue/20 to-accent-indigo/20"></div>
          
          <div className="px-8 pb-8 relative">
            {/* Avatar Row */}
            <div className="flex justify-between items-end -mt-16 mb-4">
              <div className="relative group">
                <Avatar 
                  user={profileUser} 
                  size="w-32 h-32" 
                  textClass="text-4xl"
                  showStatus={true}
                  className="ring-4 ring-bg-secondary rounded-full"
                />
                
                {isOwnProfile && (
                  <>
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="absolute bottom-2 right-2 bg-bg-secondary p-2 rounded-full border border-border text-text-primary hover:text-accent-blue hover:border-accent-blue transition-colors shadow-lg z-10"
                      title="Update Picture"
                    >
                      <Camera size={18} />
                    </button>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={onFileChange} 
                    />
                  </>
                )}
              </div>
              
              {isOwnProfile && profileUser.avatar && (
                <button 
                  onClick={removeAvatar}
                  className="text-sm text-danger hover:underline font-medium"
                >
                  Remove Picture
                </button>
              )}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-1">{profileUser.name}</h1>
              <p className="text-text-secondary font-medium text-lg flex items-center gap-2">
                {profileUser.designation || 'No Designation Set'}
              </p>
            </div>
          </div>
        </div>

        {/* Details Card */}
        <div className="bg-bg-secondary border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-text-primary border-b border-border pb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Mail size={14}/> Email Address
              </p>
              <p className="text-text-primary font-medium">{profileUser.email}</p>
            </div>
            
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <Shield size={14}/> Access Role
              </p>
              <span className={`inline-block px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                    profileUser.role === 'super_admin' ? 'text-purple-500 bg-purple-500/10' : 
                    profileUser.role === 'hr' ? 'text-accent-blue bg-accent-blue/10' :
                    profileUser.role === 'team_leader' ? 'text-orange-400 bg-orange-400/10' :
                    'text-success bg-success/10'
                  }`}>
                {profileUser.role.replace(/_/g, ' ')}
              </span>
            </div>
            
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-2">
                <UserIcon size={14}/> Status
              </p>
              <StatusBadge status={profileUser.presenceStatus || 'Active'} />
            </div>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {isCropModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[500px]">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="font-bold text-text-primary">Crop Profile Picture</h3>
              <button onClick={() => setIsCropModalOpen(false)} className="text-text-secondary hover:text-danger">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 relative bg-black">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-bg-secondary">
              <div className="mb-4">
                <label className="text-xs text-text-secondary mb-1 block">Zoom</label>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full accent-accent-blue"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsCropModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-primary rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={saveCroppedImage}
                  className="px-4 py-2 text-sm font-medium bg-accent-blue text-accent-text rounded-lg hover:bg-accent-indigo transition-colors flex items-center gap-2"
                >
                  <Check size={16}/> Save Picture
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default UserProfile;
