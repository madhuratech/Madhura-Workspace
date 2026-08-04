import React from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { X } from 'lucide-react';

const VideoCall = ({ roomName, userName, userEmail, onClose, isGroup = false }) => {
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col animate-in fade-in duration-300">
      <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800 absolute top-0 w-full z-10">
        <div className="text-white font-semibold flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
          <span>{isGroup ? 'Channel Huddle' : 'Video Call'}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-gray-800 hover:bg-danger rounded-lg text-white transition-colors flex items-center space-x-2"
        >
          <X size={18} />
          <span className="text-sm font-medium">Leave Call</span>
        </button>
      </div>
      
      <div className="flex-1 mt-16 relative bg-gray-900">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={`madhura-workspace-${roomName}`}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableModeratorIndicator: true,
            startScreenSharing: false,
            enableEmailInStats: false
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false
          }}
          userInfo={{
            displayName: userName,
            email: userEmail
          }}
          onApiReady={(externalApi) => {
            // Can add listeners here
            externalApi.addListener('videoConferenceLeft', () => {
              onClose();
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
