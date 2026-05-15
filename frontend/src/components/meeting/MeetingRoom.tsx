import {
  Camera,
  CameraOff,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  LogIn,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Radio,
  ScreenShareOff,
  Sparkles,
  Users,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChatPanel from '../chat/ChatPanel';
import { formatDateTime, getInitials } from '../../lib/utils';
import { socketService } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import { useMeetingStore } from '../../store/meetingStore';

interface RemoteStream {
  peerId: string;
  userName: string;
  stream: MediaStream;
}

interface LiveParticipant {
  userId: string;
  userName: string;
  socketId?: string;
  status: 'joined' | 'left';
}

const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

const getMeetingCodeFromInput = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';

  try {
    const url = new URL(trimmedValue);
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  } catch {
    return trimmedValue.replace(/^\/?meeting\//, '').trim();
  }
};

export default function MeetingRoom() {
  const { meetingId = 'new' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentMeeting,
    isLoading,
    createMeeting,
    fetchMeetingById,
    joinMeeting,
    leaveMeeting,
    endMeeting,
  } = useMeetingStore();

  const [setupForm, setSetupForm] = useState({
    title: 'Weekly Product Sync',
    description: 'Roadmap review, blockers, and AI-generated action items',
    scheduledAt: '',
  });
  const [joinCode, setJoinCode] = useState('');
  const [switchCode, setSwitchCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [liveParticipants, setLiveParticipants] = useState<LiveParticipant[]>([]);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [roomError, setRoomError] = useState('');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const peerUserMapRef = useRef<Record<string, string>>({});
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const joinedMeetingRef = useRef('');

  const displayName = `${user?.firstName || 'Guest'} ${user?.lastName || 'User'}`.trim();
  const isNewMeeting = meetingId === 'new';
  const inviteLink = isNewMeeting ? '' : `${window.location.origin}/meeting/${meetingId}`;
  const participantRoster = [
    {
      userId: user?._id || 'local-user',
      userName: displayName,
      socketId: 'local',
      status: hasJoinedRoom ? 'joined' : 'pending',
    },
    ...liveParticipants.filter((participant) => participant.userId !== user?._id),
  ];
  const activeParticipantCount = participantRoster.filter((participant) => participant.status === 'joined').length;

  useEffect(() => {
    if (!isNewMeeting) {
      void fetchMeetingById(meetingId);
    }
  }, [fetchMeetingById, isNewMeeting, meetingId]);

  useEffect(() => {
    let mounted = true;
    let activeStream: MediaStream | null = null;

    const startLocalMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch {
        setMediaError('Camera or microphone access is blocked. You can still join with chat and AI notes.');
      }
    };

    void startLocalMedia();

    return () => {
      mounted = false;
      Object.values(peerConnectionsRef.current).forEach((connection) => connection.close());
      peerConnectionsRef.current = {};
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream && !isScreenSharing && !isCameraOff) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [hasJoinedRoom, isCameraOff, isScreenSharing, localStream]);

  const createPeerConnection = useCallback(
    (peerId: string, userName = 'Remote teammate') => {
      const existingConnection = peerConnectionsRef.current[peerId];
      if (existingConnection) {
        return existingConnection;
      }

      const connection = new RTCPeerConnection({ iceServers });
      peerConnectionsRef.current[peerId] = connection;

      localStream?.getTracks().forEach((track) => {
        connection.addTrack(track, localStream);
      });

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendICECandidate(peerId, event.candidate);
        }
      };

      connection.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;

        setRemoteStreams((current) => {
          const exists = current.some((remoteStream) => remoteStream.peerId === peerId);
          if (exists) {
            return current.map((remoteStream) =>
              remoteStream.peerId === peerId ? { ...remoteStream, stream, userName } : remoteStream
            );
          }
          return [...current, { peerId, userName, stream }];
        });
      };

      connection.onconnectionstatechange = () => {
        if (['closed', 'disconnected', 'failed'].includes(connection.connectionState)) {
          setRemoteStreams((current) => current.filter((stream) => stream.peerId !== peerId));
        }
      };

      return connection;
    },
    [localStream]
  );

  useEffect(() => {
    setHasJoinedRoom(false);
    setRemoteStreams([]);
    setLiveParticipants([]);
    setRoomError('');
    setInviteCopied(false);
    Object.values(peerConnectionsRef.current).forEach((connection) => connection.close());
    peerConnectionsRef.current = {};
    peerUserMapRef.current = {};
  }, [meetingId]);

  useEffect(() => {
    return () => {
      const joinedMeetingId = joinedMeetingRef.current;
      if (joinedMeetingId && user?._id) {
        socketService.leaveMeeting(joinedMeetingId, user._id);
        void leaveMeeting(joinedMeetingId);
        joinedMeetingRef.current = '';
      }
    };
  }, [leaveMeeting, user?._id]);

  useEffect(() => {
    const handleUserJoined = (payload: { userId: string; userName: string; socketId: string }) => {
      if (!hasJoinedRoom || payload.userId === user?._id) return;

      peerUserMapRef.current[payload.userId] = payload.socketId;
      setLiveParticipants((current) => {
        const withoutExisting = current.filter((participant) => participant.userId !== payload.userId);
        return [...withoutExisting, { ...payload, status: 'joined' }];
      });

      const connection = createPeerConnection(payload.socketId, payload.userName);
      void connection
        .createOffer()
        .then((offer) => connection.setLocalDescription(offer).then(() => offer))
        .then((offer) => socketService.sendWebRTCOffer(payload.socketId, offer))
        .catch(() => setRoomError('A peer connection could not be negotiated for one participant.'));
    };

    const handleUserLeft = (payload: { userId: string }) => {
      const peerId = peerUserMapRef.current[payload.userId];
      if (peerId && peerConnectionsRef.current[peerId]) {
        peerConnectionsRef.current[peerId].close();
        delete peerConnectionsRef.current[peerId];
      }

      setLiveParticipants((current) =>
        current.map((participant) =>
          participant.userId === payload.userId ? { ...participant, status: 'left' } : participant
        )
      );
      setRemoteStreams((current) => current.filter((stream) => stream.peerId !== peerId));
    };

    const handleParticipants = (payload: { participants: LiveParticipant[] }) => {
      setLiveParticipants(payload.participants);
    };

    const handleOffer = (payload: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!hasJoinedRoom) return;
      const connection = createPeerConnection(payload.from);
      void connection
        .setRemoteDescription(new RTCSessionDescription(payload.offer))
        .then(() => connection.createAnswer())
        .then((answer) => connection.setLocalDescription(answer).then(() => answer))
        .then((answer) => socketService.sendWebRTCAnswer(payload.from, answer))
        .catch(() => setRoomError('A WebRTC offer could not be answered.'));
    };

    const handleAnswer = (payload: { from: string; answer: RTCSessionDescriptionInit }) => {
      const connection = peerConnectionsRef.current[payload.from];
      if (!connection) return;
      void connection
        .setRemoteDescription(new RTCSessionDescription(payload.answer))
        .catch(() => setRoomError('A WebRTC answer could not be applied.'));
    };

    const handleIceCandidate = (payload: { from: string; candidate: RTCIceCandidateInit }) => {
      const connection = peerConnectionsRef.current[payload.from];
      if (!connection) return;
      void connection
        .addIceCandidate(new RTCIceCandidate(payload.candidate))
        .catch(() => setRoomError('A network candidate could not be added.'));
    };

    socketService.on('meeting:user-joined', handleUserJoined);
    socketService.on('meeting:user-left', handleUserLeft);
    socketService.on('meeting:participants', handleParticipants);
    socketService.on('webrtc:offer', handleOffer);
    socketService.on('webrtc:answer', handleAnswer);
    socketService.on('webrtc:ice-candidate', handleIceCandidate);

    return () => {
      socketService.off('meeting:user-joined', handleUserJoined);
      socketService.off('meeting:user-left', handleUserLeft);
      socketService.off('meeting:participants', handleParticipants);
      socketService.off('webrtc:offer', handleOffer);
      socketService.off('webrtc:answer', handleAnswer);
      socketService.off('webrtc:ice-candidate', handleIceCandidate);
    };
  }, [createPeerConnection, hasJoinedRoom, user?._id]);

  const handleCreateMeeting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const meeting = await createMeeting({
      title: setupForm.title,
      description: setupForm.description,
      scheduledAt: setupForm.scheduledAt || undefined,
    });
    navigate(`/meeting/${meeting.meetingId}`);
  };

  const handleJoinByCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetMeetingId = getMeetingCodeFromInput(joinCode);

    if (!targetMeetingId) {
      setJoinError('Paste a meeting code or meeting link to join.');
      return;
    }

    setJoinError('');
    navigate(`/meeting/${targetMeetingId}`);
  };

  const joinCurrentMeeting = async () => {
    if (!user || isNewMeeting) return;

    setIsJoining(true);
    setRoomError('');

    try {
      await joinMeeting(meetingId);
      socketService.joinMeeting(meetingId, user._id, displayName);
      joinedMeetingRef.current = meetingId;
      setHasJoinedRoom(true);
    } catch {
      setRoomError('Could not join this meeting. Check the code or ask the host for a fresh link.');
    } finally {
      setIsJoining(false);
    }
  };

  const leaveRealtimeMeeting = async (destination: string) => {
    const joinedMeetingId = joinedMeetingRef.current;

    if (joinedMeetingId && user?._id) {
      socketService.leaveMeeting(joinedMeetingId, user._id);
      await leaveMeeting(joinedMeetingId);
      joinedMeetingRef.current = '';
    }

    setHasJoinedRoom(false);
    navigate(destination);
  };

  const handleSwitchMeeting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetMeetingId = getMeetingCodeFromInput(switchCode);

    if (!targetMeetingId) {
      setRoomError('Paste a meeting code or link before switching rooms.');
      return;
    }

    if (targetMeetingId === meetingId) {
      setRoomError('You are already in that meeting.');
      return;
    }

    await leaveRealtimeMeeting(`/meeting/${targetMeetingId}`);
  };

  const handleCopyInvite = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setRoomError('Copy failed. Select the meeting link and copy it manually.');
    }
  };

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });
    setIsMuted((current) => !current);
    socketService.emit(isMuted ? 'meeting:participant-unmuted' : 'meeting:participant-muted', {
      meetingId,
      userId: user?._id,
    });
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = isCameraOff;
    });
    setIsCameraOff((current) => !current);
    socketService.emit(isCameraOff ? 'meeting:participant-video-on' : 'meeting:participant-video-off', {
      meetingId,
      userId: user?._id,
    });
  };

  const replaceOutgoingVideoTrack = (track: MediaStreamTrack | null) => {
    Object.values(peerConnectionsRef.current).forEach((connection) => {
      const sender = connection.getSenders().find((rtcSender) => rtcSender.track?.kind === 'video');
      void sender?.replaceTrack(track);
    });
  };

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    const cameraTrack = localStream?.getVideoTracks()[0] || null;
    replaceOutgoingVideoTrack(cameraTrack);
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    setIsScreenSharing(false);
    socketService.emit('meeting:screen-share-stopped', { meetingId, userId: user?._id });
  }, [localStream, meetingId, user?._id]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const [screenTrack] = screenStream.getVideoTracks();
      screenStreamRef.current = screenStream;
      replaceOutgoingVideoTrack(screenTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      screenTrack.onended = stopScreenShare;
      setIsScreenSharing(true);
      socketService.emit('meeting:screen-share-started', {
        meetingId,
        userId: user?._id,
        userName: displayName,
      });
    } catch {
      setRoomError('Screen sharing could not start. Browser permission was denied or unavailable.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const streamToRecord = screenStreamRef.current || localStream;
    if (!streamToRecord || typeof MediaRecorder === 'undefined') {
      setRoomError('Recording requires an active media stream and MediaRecorder support.');
      return;
    }

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(streamToRecord);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setRecordingUrl(URL.createObjectURL(blob));
    };
    recorder.start();
    setIsRecording(true);
  };

  const handleLeaveMeeting = async () => {
    await leaveRealtimeMeeting('/dashboard');
  };

  const handleEndMeeting = async () => {
    if (!currentMeeting) return;
    await endMeeting(currentMeeting.meetingId);
    joinedMeetingRef.current = '';
    setHasJoinedRoom(false);
    navigate('/dashboard');
  };

  if (isNewMeeting) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meetings</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Start an instant room or join with a meeting code.
          </p>
        </div>

        {mediaError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-200">
            {mediaError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-950 dark:border-gray-800">
              {localStream && !isCameraOff ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="h-[420px] w-full object-cover" />
              ) : (
                <div className="flex h-[420px] flex-col items-center justify-center text-white">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold">
                    {getInitials(user?.firstName || 'Guest', user?.lastName || 'User')}
                  </div>
                  <p className="mt-4 text-lg font-semibold">{displayName}</p>
                  <p className="text-sm text-gray-400">Camera off</p>
                </div>
              )}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`rounded-full p-3 text-white transition ${
                    isMuted ? 'bg-red-600' : 'bg-gray-800/90 hover:bg-gray-700'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`rounded-full p-3 text-white transition ${
                    isCameraOff ? 'bg-red-600' : 'bg-gray-800/90 hover:bg-gray-700'
                  }`}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <form
              onSubmit={handleJoinByCode}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Join Meeting</h2>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Meeting code or link</span>
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="Paste code or meeting link"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </label>
              {joinError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{joinError}</p>}
              <button
                type="submit"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90"
              >
                <LogIn className="h-4 w-4" />
                Join
              </button>
            </form>

            <form
              onSubmit={handleCreateMeeting}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-secondary" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Meeting</h2>
              </div>
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Meeting title</span>
                  <input
                    value={setupForm.title}
                    onChange={(event) => setSetupForm((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Agenda</span>
                  <textarea
                    value={setupForm.description}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Schedule time</span>
                  <input
                    type="datetime-local"
                    value={setupForm.scheduledAt}
                    onChange={(event) =>
                      setSetupForm((current) => ({ ...current, scheduledAt: event.target.value }))
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-3 font-semibold text-white transition hover:bg-secondary/90 disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                Create room
              </button>
            </form>
          </aside>
        </div>
      </div>
    );
  }

  if (!hasJoinedRoom) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentMeeting?.title || 'Ready to join?'}
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              {currentMeeting?.description || 'Check your camera and microphone before entering the room.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/meeting/new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <ExternalLink className="h-4 w-4" />
            New or join another
          </button>
        </div>

        {(mediaError || roomError) && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-200">
            {mediaError || roomError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-950 dark:border-gray-800">
            {localStream && !isCameraOff ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="h-[520px] w-full object-cover" />
            ) : (
              <div className="flex h-[520px] flex-col items-center justify-center text-white">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-bold">
                  {getInitials(user?.firstName || 'Guest', user?.lastName || 'User')}
                </div>
                <p className="mt-4 text-lg font-semibold">{displayName}</p>
                <p className="text-sm text-gray-400">Camera off</p>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className={`rounded-full p-3 text-white transition ${
                  isMuted ? 'bg-red-600' : 'bg-gray-800/90 hover:bg-gray-700'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`rounded-full p-3 text-white transition ${
                  isCameraOff ? 'bg-red-600' : 'bg-gray-800/90 hover:bg-gray-700'
                }`}
                title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Meeting details</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Code</dt>
                  <dd className="break-all text-right font-mono font-semibold text-gray-900 dark:text-white">
                    {meetingId}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Scheduled</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {currentMeeting?.scheduledAt ? formatDateTime(currentMeeting.scheduledAt) : 'Instant'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-medium capitalize text-gray-900 dark:text-white">
                    {currentMeeting?.status || (isLoading ? 'loading' : 'ready')}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => void joinCurrentMeeting()}
                disabled={isJoining || isLoading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60"
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Join now
              </button>
            </section>

            <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invite link</h2>
              <div className="mt-3 rounded-lg bg-gray-50 p-3 font-mono text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {inviteLink}
              </div>
              <button
                type="button"
                onClick={() => void handleCopyInvite()}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Copy className="h-4 w-4" />
                {inviteCopied ? 'Copied' : 'Copy invite'}
              </button>
            </section>

            <form
              onSubmit={handleSwitchMeeting}
              className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Join another meeting</h2>
              <input
                value={switchCode}
                onChange={(event) => setSwitchCode(event.target.value)}
                placeholder="Paste another code or link"
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-white transition hover:bg-secondary/90"
              >
                <ExternalLink className="h-4 w-4" />
                Switch
              </button>
            </form>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentMeeting?.title || 'Meeting Room'}
            </h1>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
              <Radio className="h-3.5 w-3.5" />
              Live
            </span>
          </div>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {currentMeeting?.description || 'Secure WebRTC room with AI meeting intelligence.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="block text-xs text-gray-500">Room ID</span>
            <span className="font-mono font-semibold text-gray-900 dark:text-white">{meetingId}</span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <span className="block text-xs text-gray-500">Participants</span>
            <span className="font-semibold text-gray-900 dark:text-white">{activeParticipantCount}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Copy className="h-4 w-4" />
            {inviteCopied ? 'Copied' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={() => void leaveRealtimeMeeting('/meeting/new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 font-semibold text-white transition hover:bg-secondary/90"
          >
            <ExternalLink className="h-4 w-4" />
            Join another
          </button>
        </div>
      </div>

      {(mediaError || roomError) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-200">
          {mediaError || roomError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-4">
          <div className="grid min-h-[420px] gap-4 md:grid-cols-2">
            <article className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-950 dark:border-gray-800">
              {localStream && !isCameraOff ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full min-h-[320px] w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-gray-900 text-white">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-bold">
                    {getInitials(user?.firstName || 'Guest', user?.lastName || 'User')}
                  </div>
                  <p className="mt-3 font-semibold">{displayName}</p>
                  <p className="text-sm text-gray-400">Camera off</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                You {isMuted ? '(muted)' : ''}
              </div>
            </article>

            {remoteStreams.map((remoteStream) => (
              <article
                key={remoteStream.peerId}
                className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-950 dark:border-gray-800"
              >
                <video
                  autoPlay
                  playsInline
                  ref={(node) => {
                    if (node) {
                      node.srcObject = remoteStream.stream;
                    }
                  }}
                  className="h-full min-h-[320px] w-full object-cover"
                />
                <div className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                  {remoteStream.userName}
                </div>
              </article>
            ))}

            {remoteStreams.length === 0 && (
              <article className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
                <Users className="h-10 w-10 text-primary" />
                <p className="mt-4 font-semibold text-gray-900 dark:text-white">Waiting for teammates</p>
                <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                  Share the room link. New participants will appear here through WebRTC peer connections.
                </p>
              </article>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <button
              type="button"
              onClick={toggleMute}
              className={`rounded-full p-3 text-white transition ${isMuted ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              className={`rounded-full p-3 text-white transition ${
                isCameraOff ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => void toggleScreenShare()}
              className={`rounded-full p-3 text-white transition ${
                isScreenSharing ? 'bg-secondary' : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
            >
              {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              className={`rounded-full p-3 text-white transition ${isRecording ? 'bg-red-600' : 'bg-gray-800 hover:bg-gray-700'}`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Radio className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => void handleLeaveMeeting()}
              className="rounded-full bg-red-600 p-3 text-white transition hover:bg-red-700"
              title="Leave meeting"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            {currentMeeting?.host?._id === user?._id && (
              <button
                type="button"
                onClick={() => void handleEndMeeting()}
                className="rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-900/20"
              >
                End meeting
              </button>
            )}
            {recordingUrl && (
              <a
                href={recordingUrl}
                download={`${currentMeeting?.title || 'meeting'}-recording.webm`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <Download className="h-4 w-4" />
                Download recording
              </a>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-gray-900 dark:text-white">AI Meeting Intelligence</h2>
              </div>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Transcription and summaries are generated after recordings or transcripts are uploaded to the AI
                service. Action items are automatically extracted with assignees, priorities, and deadlines.
              </p>
              <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
                <p className="font-semibold text-gray-900 dark:text-white">Detected action pattern</p>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  "Nand will complete frontend by Friday" becomes a task assigned to Nand with a Friday deadline.
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-secondary" />
                <h2 className="font-bold text-gray-900 dark:text-white">Meeting Details</h2>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Scheduled</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {currentMeeting?.scheduledAt ? formatDateTime(currentMeeting.scheduledAt) : 'Instant'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-medium capitalize text-gray-900 dark:text-white">
                    {currentMeeting?.status || 'ongoing'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Recording</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">
                    {isRecording ? 'Recording now' : recordingUrl ? 'Ready to download' : 'Not started'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <aside className="min-h-[720px] space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h2 className="font-bold text-gray-900 dark:text-white">Connected members</h2>
              </div>
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                {activeParticipantCount}
              </span>
            </div>
            <div className="space-y-2">
              {participantRoster.map((participant) => (
                <div
                  key={`${participant.userId}-${participant.socketId}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-xs font-bold text-white">
                      {getInitials(participant.userName.split(' ')[0] || 'Team', participant.userName.split(' ')[1] || 'Member')}
                    </div>
                    <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {participant.userName}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      participant.status === 'joined'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {participant.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <form
            onSubmit={handleSwitchMeeting}
            className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="font-bold text-gray-900 dark:text-white">Join another meeting</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={switchCode}
                onChange={(event) => setSwitchCode(event.target.value)}
                placeholder="Code or link"
                className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <button
                type="submit"
                className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-white transition hover:bg-secondary/90"
              >
                Join
              </button>
            </div>
          </form>

          <ChatPanel
            compact
            meetingId={currentMeeting?._id}
            title="Meeting Chat"
            subtitle="Shared notes, links, and decisions for this live room"
          />
        </aside>
      </div>
    </div>
  );
}
