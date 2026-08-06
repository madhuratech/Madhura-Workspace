import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { Camera, Mail, Shield, User as UserIcon, X, Check } from 'lucide-react';
import Avatar from '../components/Avatar';
import Cropper from 'react-easy-crop';

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-blue/30 border-t-accent-blue"></div>
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
              <p className="text-text-primary font-medium">{profileUser.presenceStatus || 'Active'}</p>
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
                  className="px-4 py-2 text-sm font-medium bg-accent-blue text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
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
