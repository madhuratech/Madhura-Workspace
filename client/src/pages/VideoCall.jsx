import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { ArrowLeft, Loader2, StopCircle } from 'lucide-react';

const VideoCall = () => {
  const { id: workspaceId, meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { showToast } = useContext(ToastContext);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetingDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const fetchMeetingDetails = async () => {
    try {
      const res = await axios.get(`/workspaces/${workspaceId}/meetings`);
      const currentMeeting = res.data.find(m => m._id === meetingId);
      
      if (!currentMeeting) {
        showToast('Meeting not found', 'error');
        navigate(`/meetings`);
        return;
      }
      
      if (!currentMeeting.videoCallId) {
        showToast('This is not a native video call', 'error');
        navigate(`/meetings`);
        return;
      }

      setMeeting(currentMeeting);
      setLoading(false);
      
      // Mark as joined
      await axios.post(`/meetings/${meetingId}/join`);
      
    } catch (error) {
      console.error(error);
      showToast('Error loading meeting', 'error');
      navigate(`/meetings`);
    }
  };

  const handleEndCall = async () => {
    try {
      if (meeting.createdBy._id === user._id || meeting.createdBy === user._id) {
        // Only host can end meeting for everyone and generate AI notes
        await axios.post(`/meetings/${meetingId}/end`);
        showToast('Meeting ended. AI Notes are being generated.', 'success');
      }
      navigate('/meetings');
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-secondary">
        <Loader2 className="animate-spin text-accent-blue" size={48} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      <div className="h-14 bg-black border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center text-white">
          <button 
            onClick={() => navigate('/meetings')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors mr-2"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-bold">{meeting.title}</span>
        </div>
        
        {(meeting.createdBy._id === user._id || meeting.createdBy === user._id) && (
          <button 
            onClick={handleEndCall}
            className="flex items-center px-4 py-1.5 bg-danger hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <StopCircle size={16} className="mr-2" /> End Meeting for All
          </button>
        )}
      </div>

      <div className="flex-1">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`MadhuraWorkspace-${meeting.videoCallId}`}
          configOverwrite={{
            startWithAudioMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: true,
            enableEmailInStats: false
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true
          }}
          userInfo={{
            displayName: user.name
          }}
          onApiReady={(externalApi) => {
            // Attach custom event listeners here if needed
            externalApi.addListener('videoConferenceLeft', () => {
              navigate('/meetings');
            });
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
          }}
        />
      </div>
    </div>
  );
};

export default VideoCall;
