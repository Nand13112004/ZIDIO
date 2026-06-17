import {
  Camera,
  CameraOff,
  CalendarClock,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Hand,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  LogIn,
  Mic,
  MicOff,
  MonitorUp,
  NotebookPen,
  PhoneOff,
  Radio,
  ScreenShareOff,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ChatPanel from '../chat/ChatPanel';
import { formatDateTime, getInitials } from '../../lib/utils';
import { meetingService, taskService } from '../../services';
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

interface RaisedHand {
  userId: string;
  userName: string;
  raisedAt: string;
}

interface FloatingReaction {
  id: string;
  emoji: string;
  userName: string;
}

interface LobbyRequest {
  userId: string;
  userName: string;
  socketId: string;
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
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'join' ? 'join' : 'create';
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
    agenda: 'Review blockers, assign owners, and confirm next sprint actions',
    durationMinutes: 30,
    password: '',
    waitingRoom: true,
    endToEndEncryption: true,
    recurring: false,
    emailSummary: true,
    whatsappSummary: false,
  });
  const [joinCode, setJoinCode] = useState('');
  const [switchCode, setSwitchCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinError, setJoinError] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [liveParticipants, setLiveParticipants] = useState<LiveParticipant[]>([]);
  const [raisedHands, setRaisedHands] = useState<Record<string, RaisedHand>>({});
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [lobbyRequests, setLobbyRequests] = useState<LobbyRequest[]>([]);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [roomError, setRoomError] = useState('');
  const [sharedNotes, setSharedNotes] = useState('');
  const [transcriptDraft, setTranscriptDraft] = useState(
    'Nand will complete the frontend polish by Friday. Priya should verify deployment on Vercel and Render. The team is confident about the demo, but backend environment variables remain a risk.'
  );
  const [aiReport, setAiReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [meetingTask, setMeetingTask] = useState('');
  const [createdTasks, setCreatedTasks] = useState<string[]>([]);
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  const [liveSettings, setLiveSettings] = useState({
    waitingRoom: false,
    endToEndEncryption: false,
  });

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const peerUserMapRef = useRef<Record<string, string>>({});
  const screenStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const joinedMeetingRef = useRef('');
  const completeJoinCurrentMeetingRef = useRef<() => Promise<void>>(async () => undefined);

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
  const currentMeetingAny = currentMeeting as any;
  const meetingSettings = currentMeetingAny?.settings || {};
  const meetingMetadata = currentMeetingAny?.metadata || {};
  const isHost = currentMeetingAny?.host?._id === user?._id || currentMeetingAny?.host === user?._id;
  const durationMinutes = Number(meetingMetadata.durationMinutes || setupForm.durationMinutes || 30);
  const minutesRemaining = Math.max(durationMinutes - Math.floor(meetingSeconds / 60), 0);
  const timerIsEnding = hasJoinedRoom && durationMinutes > 0 && minutesRemaining <= 5;
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    currentMeeting?.title || setupForm.title
  )}&details=${encodeURIComponent(inviteLink || setupForm.description)}&location=${encodeURIComponent(inviteLink || 'IntellMeet')}`;

  useEffect(() => {
    completeJoinCurrentMeetingRef.current = async () => {
      if (!user || isNewMeeting) return;

      setIsJoining(true);
      setRoomError('');

      try {
        await joinMeeting(meetingId, joinPassword || undefined);
        socketService.joinMeeting(meetingId, user._id, displayName);
        joinedMeetingRef.current = meetingId;
        setHasJoinedRoom(true);
      } catch {
        setRoomError('Could not join this meeting. Check the password or ask the host for a fresh link.');
      } finally {
        setIsJoining(false);
      }
    };
  }, [displayName, isNewMeeting, joinMeeting, joinPassword, meetingId, user]);

  useEffect(() => {
    if (!isNewMeeting) {
      void fetchMeetingById(meetingId);
    }
  }, [fetchMeetingById, isNewMeeting, meetingId]);

  useEffect(() => {
    if (!hasJoinedRoom) {
      setMeetingSeconds(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setMeetingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [hasJoinedRoom]);

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
    setRaisedHands({});
    setFloatingReactions([]);
    setLobbyRequests([]);
    setIsHandRaised(false);
    setRoomError('');
    setInviteCopied(false);
    setAiReport(null);
    setCreatedTasks([]);
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

  useEffect(() => {
    const handleMeetingState = (payload: {
      sharedNotes?: string;
      raisedHands?: Record<string, RaisedHand>;
      settings?: { waitingRoom?: boolean; endToEndEncryption?: boolean };
    }) => {
      if (payload.sharedNotes !== undefined) setSharedNotes(payload.sharedNotes);
      if (payload.raisedHands) setRaisedHands(payload.raisedHands);
      if (payload.settings) {
        setLiveSettings((current) => ({ ...current, ...payload.settings }));
      }
    };

    const handleReaction = (payload: { emoji: string; userName: string }) => {
      const reaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji: payload.emoji,
        userName: payload.userName,
      };
      setFloatingReactions((current) => [...current, reaction]);
      window.setTimeout(() => {
        setFloatingReactions((current) => current.filter((item) => item.id !== reaction.id));
      }, 2600);
    };

    const handleRaisedHands = (payload: Record<string, RaisedHand>) => {
      setRaisedHands(payload);
      setIsHandRaised(Boolean(user?._id && payload[user._id]));
    };

    const handleNotesUpdate = (payload: { notes: string }) => {
      setSharedNotes(payload.notes);
    };

    const handleMeetingTask = (payload: { task: string; userName: string }) => {
      setCreatedTasks((current) => [`${payload.task} - ${payload.userName}`, ...current].slice(0, 5));
    };

    const handleSettingsUpdate = (payload: { settings: { waitingRoom?: boolean; endToEndEncryption?: boolean } }) => {
      setLiveSettings((current) => ({ ...current, ...payload.settings }));
    };

    const handleAdmissionRequest = (payload: LobbyRequest) => {
      if (!isHost) return;
      setLobbyRequests((current) => {
        const exists = current.some((request) => request.socketId === payload.socketId);
        return exists ? current : [payload, ...current];
      });
    };

    const handleAdmissionApproved = () => {
      void completeJoinCurrentMeetingRef.current();
    };

    socketService.on('meeting:state', handleMeetingState);
    socketService.on('meeting:reaction', handleReaction);
    socketService.on('meeting:raised-hands', handleRaisedHands);
    socketService.on('meeting:shared-notes-update', handleNotesUpdate);
    socketService.on('meeting:task-create', handleMeetingTask);
    socketService.on('meeting:settings-update', handleSettingsUpdate);
    socketService.on('meeting:admission-request', handleAdmissionRequest);
    socketService.on('meeting:admission-approved', handleAdmissionApproved);

    return () => {
      socketService.off('meeting:state', handleMeetingState);
      socketService.off('meeting:reaction', handleReaction);
      socketService.off('meeting:raised-hands', handleRaisedHands);
      socketService.off('meeting:shared-notes-update', handleNotesUpdate);
      socketService.off('meeting:task-create', handleMeetingTask);
      socketService.off('meeting:settings-update', handleSettingsUpdate);
      socketService.off('meeting:admission-request', handleAdmissionRequest);
      socketService.off('meeting:admission-approved', handleAdmissionApproved);
    };
  }, [isHost, user?._id]);

  const handleCreateMeeting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const meeting = await createMeeting({
      title: setupForm.title,
      description: setupForm.description,
      scheduledAt: setupForm.scheduledAt || undefined,
      settings: {
        requirePassword: Boolean(setupForm.password.trim()),
        password: setupForm.password.trim(),
        waitingRoom: setupForm.waitingRoom,
        endToEndEncryption: setupForm.endToEndEncryption,
        allowReactions: true,
        autoTranscription: true,
        maxParticipants: 100,
      },
      metadata: {
        agenda: setupForm.agenda,
        recurrence: setupForm.recurring ? 'weekly' : 'none',
        durationMinutes: Number(setupForm.durationMinutes) || 30,
        delivery: {
          email: setupForm.emailSummary,
          whatsapp: setupForm.whatsappSummary,
        },
        integrations: {
          calendarUrl: googleCalendarUrl,
        },
      },
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

    setRoomError('');

    if ((meetingSettings.waitingRoom || liveSettings.waitingRoom) && !isHost) {
      setIsJoining(true);
      setRoomError('Waiting room active. Host approval is requested.');
      socketService.emit('meeting:admission-request', {
        meetingId,
        userId: user._id,
        userName: displayName,
      });
      return;
    }

    await completeJoinCurrentMeetingRef.current();
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

  const sendReaction = (emoji: string) => {
    socketService.emit('meeting:reaction', {
      meetingId,
      userId: user?._id,
      userName: displayName,
      emoji,
    });
  };

  const toggleRaiseHand = () => {
    if (!user?._id) return;

    const eventName = isHandRaised ? 'meeting:lower-hand' : 'meeting:raise-hand';
    socketService.emit(eventName, {
      meetingId,
      userId: user._id,
      userName: displayName,
    });
    setIsHandRaised((current) => !current);
  };

  const handleSharedNotesChange = (notes: string) => {
    setSharedNotes(notes);
    socketService.emit('meeting:shared-notes-update', {
      meetingId,
      notes,
      userId: user?._id,
      userName: displayName,
    });
  };

  const handleCreateMeetingTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = meetingTask.trim();
    if (!title) return;

    setMeetingTask('');

    try {
      await taskService.createTask({
        title,
        description: `Created inside meeting: ${currentMeeting?.title || meetingId}`,
        priority: 'medium',
      });
      setCreatedTasks((current) => [title, ...current].slice(0, 5));
      socketService.emit('meeting:task-create', {
        meetingId,
        task: title,
        userId: user?._id,
        userName: displayName,
      });
    } catch {
      setRoomError('Task creation failed. It will still remain in the shared meeting notes.');
      setCreatedTasks((current) => [title, ...current].slice(0, 5));
    }
  };

  const handleGenerateAIReport = async () => {
    if (!transcriptDraft.trim()) {
      setRoomError('Paste transcript text or meeting notes before generating AI intelligence.');
      return;
    }

    setIsGeneratingReport(true);
    setRoomError('');

    try {
      const response = await meetingService.generateMeetingIntelligence(meetingId, transcriptDraft);
      setAiReport(response.data.data.summary);
    } catch {
      setRoomError('AI report generation failed. Check backend logs or OpenAI configuration.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const updateLiveSetting = (key: 'waitingRoom' | 'endToEndEncryption', value: boolean) => {
    setLiveSettings((current) => ({ ...current, [key]: value }));
    socketService.emit('meeting:settings-update', {
      meetingId,
      settings: { [key]: value },
      userId: user?._id,
      userName: displayName,
    });
  };

  const approveLobbyRequest = (request: LobbyRequest) => {
    socketService.emit('meeting:admission-approved', {
      meetingId,
      userId: request.userId,
      socketId: request.socketId,
    });
    setLobbyRequests((current) => current.filter((item) => item.socketId !== request.socketId));
  };

  const exportTextFile = (fileName: string, content: string, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportReportAsCsv = () => {
    const rows = [
      ['Section', 'Value'],
      ['Meeting', currentMeeting?.title || meetingId],
      ['Summary', aiReport?.summary || 'Not generated'],
      ['Sentiment', aiReport?.sentiment?.overall || 'neutral'],
      ['Actions', (aiReport?.actionItems || []).map((item: any) => item.task).join('; ')],
    ];
    exportTextFile(
      `${currentMeeting?.title || 'meeting'}-summary.csv`,
      rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n'),
      'text/csv'
    );
  };

  const exportReportAsPdfText = () => {
    exportTextFile(
      `${currentMeeting?.title || 'meeting'}-report.txt`,
      [
        `IntellMeet AI Report: ${currentMeeting?.title || meetingId}`,
        '',
        aiReport?.summary || 'No AI report generated yet.',
        '',
        'Shared Notes:',
        sharedNotes || 'No shared notes captured.',
      ].join('\n')
    );
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
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div>
          <h1 className="im-page-title">Meetings</h1>
          <p className="im-page-subtitle">Start an instant room, schedule a meeting, or join an active session.</p>
        </div>

        {mediaError && (
          <div className="im-alert im-alert-error">
            <span>{mediaError}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-[--color-border] bg-slate-950 aspect-video flex items-center justify-center">
              {localStream && !isCameraOff ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-white">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[--color-primary] text-xl font-bold shadow-lg">
                    {getInitials(user?.firstName || 'Guest', user?.lastName || 'User')}
                  </div>
                  <p className="mt-4 font-bold text-base">{displayName}</p>
                  <p className="text-xs text-slate-400 mt-1">Camera off</p>
                </div>
              )}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 z-10">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`rounded-full p-3 text-white transition-all shadow-md ${
                    isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800/90 hover:bg-slate-700'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`rounded-full p-3 text-white transition-all shadow-md ${
                    isCameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800/90 hover:bg-slate-700'
                  }`}
                  title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
                >
                  {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            {initialMode === 'join' ? (
              <form onSubmit={handleJoinByCode} className="im-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <LogIn className="h-4.5 w-4.5 text-[--color-primary]" />
                  <h2 className="text-base font-bold text-[--color-foreground]">Join Meeting</h2>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="meeting-join-code">Meeting code or link</label>
                  <input
                    id="meeting-join-code"
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value)}
                    placeholder="Paste code or meeting link"
                    className="im-input"
                  />
                </div>
                {joinError && <p className="mt-2 text-xs font-medium text-red-600">{joinError}</p>}
                <button
                  type="submit"
                  className="im-btn im-btn-primary w-full mt-4"
                  id="btn-join-code"
                >
                  <LogIn className="h-4 w-4" />
                  Join room
                </button>
                <div className="mt-4 text-center">
                  <button type="button" className="text-sm text-[--color-primary] hover:underline" onClick={() => navigate('/meeting/new?mode=create')}>Want to start a new meeting?</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateMeeting} className="im-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Video className="h-4.5 w-4.5 text-[--color-secondary]" />
                  <h2 className="text-base font-bold text-[--color-foreground]">New Meeting</h2>
                </div>
                <div className="grid gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="new-meeting-title">Meeting title</label>
                    <input
                      id="new-meeting-title"
                      value={setupForm.title}
                      onChange={(event) => setSetupForm((current) => ({ ...current, title: event.target.value }))}
                      className="im-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="new-meeting-desc">Agenda</label>
                    <textarea
                      id="new-meeting-desc"
                      value={setupForm.description}
                      onChange={(event) =>
                        setSetupForm((current) => ({ ...current, description: event.target.value }))
                      }
                      rows={2}
                      className="im-input resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="new-meeting-time">Schedule time</label>
                    <input
                      id="new-meeting-time"
                      type="datetime-local"
                      value={setupForm.scheduledAt}
                      onChange={(event) =>
                        setSetupForm((current) => ({ ...current, scheduledAt: event.target.value }))
                      }
                      className="im-input"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="new-meeting-duration">Duration (mins)</label>
                      <input
                        id="new-meeting-duration"
                        type="number"
                        min={10}
                        max={240}
                        value={setupForm.durationMinutes}
                        onChange={(event) =>
                          setSetupForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))
                        }
                        className="im-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[--color-text-secondary] mb-1.5" htmlFor="new-meeting-password">Password</label>
                      <input
                        id="new-meeting-password"
                        value={setupForm.password}
                        onChange={(event) => setSetupForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="Optional"
                        className="im-input"
                      />
                    </div>
                  </div>
                  <textarea
                    value={setupForm.agenda}
                    onChange={(event) => setSetupForm((current) => ({ ...current, agenda: event.target.value }))}
                    rows={2}
                    className="im-input resize-none"
                    placeholder="AI agenda suggestions or discussion points"
                  />
                  <div className="grid gap-2 rounded-xl border border-[--color-border] bg-[--color-surface-2] p-3 text-xs">
                    <ToggleLine
                      icon={Lock}
                      label="Waiting room"
                      checked={setupForm.waitingRoom}
                      onChange={(checked) => setSetupForm((current) => ({ ...current, waitingRoom: checked }))}
                    />
                    <ToggleLine
                      icon={ShieldCheck}
                      label="End-to-end encryption"
                      checked={setupForm.endToEndEncryption}
                      onChange={(checked) => setSetupForm((current) => ({ ...current, endToEndEncryption: checked }))}
                    />
                    <ToggleLine
                      icon={CalendarClock}
                      label="Recurring weekly"
                      checked={setupForm.recurring}
                      onChange={(checked) => setSetupForm((current) => ({ ...current, recurring: checked }))}
                    />
                    <ToggleLine
                      icon={Mail}
                      label="Email summary delivery"
                      checked={setupForm.emailSummary}
                      onChange={(checked) => setSetupForm((current) => ({ ...current, emailSummary: checked }))}
                    />
                    <ToggleLine
                      icon={MessageCircle}
                      label="WhatsApp summary delivery"
                      checked={setupForm.whatsappSummary}
                      onChange={(checked) => setSetupForm((current) => ({ ...current, whatsappSummary: checked }))}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!setupForm.title.trim()}
                  className="im-btn im-btn-primary w-full mt-4 text-base py-3"
                  id="btn-start-meeting"
                >
                  <Video className="h-5 w-5" />
                  Start Meeting
                </button>
                <div className="mt-4 text-center">
                  <button type="button" className="text-sm text-[--color-primary] hover:underline" onClick={() => navigate('/meeting/new?mode=join')}>Have an invite code? Join instead</button>
                </div>
              </form>
            )}
          </aside>
        </div>
      </div>
    );
  }

  if (!hasJoinedRoom) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="im-page-title">
              {currentMeeting?.title || 'Ready to join?'}
            </h1>
            <p className="im-page-subtitle mt-1">
              {currentMeeting?.description || 'Verify camera and audio setup before entering the room.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/meeting/new')}
            className="im-btn im-btn-outline shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            Join another
          </button>
        </div>

        {(mediaError || roomError) && (
          <div className="im-alert im-alert-error">
            <span>{mediaError || roomError}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="relative overflow-hidden rounded-2xl border border-[--color-border] bg-slate-950 aspect-video flex items-center justify-center">
            {localStream && !isCameraOff ? (
              <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[--color-primary] text-xl font-bold shadow-lg">
                  {getInitials(user?.firstName || 'Guest', user?.lastName || 'User')}
                </div>
                <p className="mt-4 font-bold text-base">{displayName}</p>
                <p className="text-xs text-slate-400 mt-1">Camera off</p>
              </div>
            )}
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-3 z-10">
              <button
                type="button"
                onClick={toggleMute}
                className={`rounded-full p-3 text-white transition-all shadow-md ${
                  isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800/90 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className={`rounded-full p-3 text-white transition-all shadow-md ${
                  isCameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800/90 hover:bg-slate-700'
                }`}
                title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
              >
                {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
              </button>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="im-card p-5">
              <h2 className="text-base font-bold text-[--color-foreground] mb-4">Meeting details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-[--color-text-muted]">Room Code</dt>
                  <dd className="font-mono font-bold text-[--color-foreground] break-all">{meetingId}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[--color-text-muted]">Scheduled</dt>
                  <dd className="font-semibold text-[--color-foreground]">
                    {currentMeeting?.scheduledAt ? formatDateTime(currentMeeting.scheduledAt) : 'Instant'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[--color-text-muted]">Status</dt>
                  <dd className="font-semibold text-[--color-foreground] capitalize">
                    {currentMeeting?.status || (isLoading ? 'loading' : 'ready')}
                  </dd>
                </div>
              </dl>
              {meetingSettings.requirePassword && (
                <label className="mt-4 block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[--color-text-secondary]">
                    <KeyRound className="h-3.5 w-3.5" />
                    Meeting password
                  </span>
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(event) => setJoinPassword(event.target.value)}
                    className="im-input"
                    placeholder="Enter host password"
                  />
                </label>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {(meetingSettings.waitingRoom || liveSettings.waitingRoom) && (
                  <span className="im-badge im-badge-blue">
                    <Lock className="h-3.5 w-3.5" />
                    Waiting room
                  </span>
                )}
                {(meetingSettings.endToEndEncryption || liveSettings.endToEndEncryption) && (
                  <span className="im-badge im-badge-green">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    E2EE
                  </span>
                )}
                <span className="im-badge im-badge-purple">
                  <WandSparkles className="h-3.5 w-3.5" />
                  AI agenda ready
                </span>
              </div>
              <button
                type="button"
                onClick={() => void joinCurrentMeeting()}
                disabled={isJoining || isLoading}
                className="im-btn im-btn-primary w-full mt-5"
                id="btn-join-now"
              >
                {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Join now
              </button>
            </section>

            <section className="im-card p-5">
              <h2 className="text-base font-bold text-[--color-foreground] mb-3">Invite link</h2>
              <div className="rounded-xl bg-[--color-surface-2] border border-[--color-border] p-3 font-mono text-xs text-[--color-text-secondary] break-all">
                {inviteLink}
              </div>
              <button
                type="button"
                onClick={() => void handleCopyInvite()}
                className="im-btn im-btn-outline w-full mt-3"
                id="btn-copy-invite"
              >
                <Copy className="h-4 w-4" />
                {inviteCopied ? 'Copied' : 'Copy invite link'}
              </button>
            </section>

            <form onSubmit={handleSwitchMeeting} className="im-card p-5">
              <h2 className="text-base font-bold text-[--color-foreground] mb-3">Join another meeting</h2>
              <input
                value={switchCode}
                onChange={(event) => setSwitchCode(event.target.value)}
                placeholder="Paste code or link"
                className="im-input"
              />
              <button type="submit" className="im-btn im-btn-secondary w-full mt-3">
                <ExternalLink className="h-4 w-4" />
                Switch Room
              </button>
            </form>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="im-page-title">
              {currentMeeting?.title || 'Meeting Room'}
            </h1>
            <span className="im-badge im-badge-green">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              Live
            </span>
          </div>
          <p className="im-page-subtitle mt-1">
            {currentMeeting?.description || 'Secure WebRTC room with AI meeting intelligence.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="rounded-xl border border-[--color-border] bg-white px-4 py-2 text-center shadow-xs">
            <span className="block text-[10px] text-[--color-text-muted] font-bold uppercase tracking-wider">Room Code</span>
            <span className="font-mono font-bold text-[--color-foreground] text-sm mt-0.5 block">{meetingId}</span>
          </div>
          <div className="rounded-xl border border-[--color-border] bg-white px-4 py-2 text-center shadow-xs">
            <span className="block text-[10px] text-[--color-text-muted] font-bold uppercase tracking-wider">Teammates</span>
            <span className="font-bold text-[--color-foreground] text-sm mt-0.5 block">{activeParticipantCount}</span>
          </div>
          <div
            className={`rounded-xl border px-4 py-2 text-center shadow-xs ${
              timerIsEnding
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-[--color-border] bg-white text-[--color-foreground]'
            }`}
          >
            <span className="block text-[10px] font-bold uppercase tracking-wider opacity-70">Timer</span>
            <span className="mt-0.5 block text-sm font-black">
              {formatMeetingClock(meetingSeconds)} / {durationMinutes}m
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            className="im-btn im-btn-outline h-11 px-4"
            id="btn-copy-invite-live"
          >
            <Copy className="h-4 w-4" />
            {inviteCopied ? 'Copied' : 'Invite link'}
          </button>
          <button
            type="button"
            onClick={() => void leaveRealtimeMeeting('/meeting/new')}
            className="im-btn im-btn-secondary h-11 px-4"
          >
            <ExternalLink className="h-4 w-4" />
            New Room
          </button>
        </div>
      </div>

      {(mediaError || roomError) && (
        <div className="im-alert im-alert-error">
          <span>{mediaError || roomError}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="relative space-y-5">
          <div className="pointer-events-none absolute right-4 top-4 z-20 space-y-2">
            {floatingReactions.map((reaction) => (
              <div
                key={reaction.id}
                className="animate-fade-in rounded-full bg-white/95 px-3 py-2 text-sm font-bold text-[--color-foreground] shadow-lg ring-1 ring-[--color-border]"
              >
                <span className="mr-2 text-lg">{reaction.emoji}</span>
                {reaction.userName}
              </div>
            ))}
          </div>

          <div className="grid min-h-[420px] gap-4 md:grid-cols-2">
            {/* Local Stream */}
            <article className="relative overflow-hidden rounded-2xl border border-[--color-border] bg-slate-950 aspect-video flex items-center justify-center group shadow-sm">
              {localStream && !isCameraOff ? (
                <video ref={localVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center text-white">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[--color-primary] text-lg font-bold shadow-lg">
                    {getInitials(user?.firstName || 'Guest', user?.lastName || 'User')}
                  </div>
                  <p className="mt-3 font-bold text-sm">{displayName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Camera off</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                You {isMuted ? '(muted)' : ''}
              </div>
            </article>

            {/* Remote Streams */}
            {remoteStreams.map((remoteStream) => (
              <article
                key={remoteStream.peerId}
                className="relative overflow-hidden rounded-2xl border border-[--color-border] bg-slate-950 aspect-video flex items-center justify-center group shadow-sm"
              >
                <video
                  autoPlay
                  playsInline
                  ref={(node) => {
                    if (node) {
                      node.srcObject = remoteStream.stream;
                    }
                  }}
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
                  {remoteStream.userName}
                </div>
              </article>
            ))}

            {remoteStreams.length === 0 && (
              <article className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[--color-border] bg-white p-8 text-center">
                <Users className="h-9 w-9 text-[--color-primary] opacity-40 mb-3" />
                <h3 className="font-bold text-[--color-foreground] text-sm">Waiting for teammates</h3>
                <p className="mt-1 max-w-xs text-xs text-[--color-text-muted] leading-relaxed">
                  Share the room code or link to collaborate. Connected peers will appear instantly.
                </p>
              </article>
            )}
          </div>

          {/* Control Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 rounded-2xl border border-[--color-border] bg-white p-4 shadow-sm">
            <button
              type="button"
              onClick={toggleMute}
              className={`rounded-full p-3.5 text-white transition-all shadow-sm ${
                isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              className={`rounded-full p-3.5 text-white transition-all shadow-sm ${
                isCameraOff ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
            >
              {isCameraOff ? <CameraOff className="h-5 w-5" /> : <Camera className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => void toggleScreenShare()}
              className={`rounded-full p-3.5 text-white transition-all shadow-sm ${
                isScreenSharing ? 'bg-[--color-secondary] hover:bg-[--color-secondary-hover]' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
            >
              {isScreenSharing ? <ScreenShareOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={toggleRecording}
              className={`rounded-full p-3.5 text-white transition-all shadow-sm ${
                isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              <Radio className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleRaiseHand}
              className={`rounded-full p-3.5 text-white transition-all shadow-sm ${
                isHandRaised ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-800 hover:bg-slate-700'
              }`}
              title={isHandRaised ? 'Lower hand' : 'Raise hand'}
            >
              <Hand className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1 rounded-full border border-[--color-border] bg-[--color-surface-2] p-1">
              {['👍', '👏', '❤️', '🎉'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendReaction(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base shadow-xs transition hover:scale-105"
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void handleLeaveMeeting()}
              className="rounded-full bg-red-600 p-3.5 text-white transition-all hover:bg-red-700 shadow-sm"
              title="Leave meeting"
              id="btn-leave-meeting"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
            {currentMeeting?.host?._id === user?._id && (
              <button
                type="button"
                onClick={() => void handleEndMeeting()}
                className="im-btn im-btn-danger h-12 px-4 shadow-sm"
                id="btn-end-meeting"
              >
                End Meeting
              </button>
            )}
            {recordingUrl && (
              <a
                href={recordingUrl}
                download={`${currentMeeting?.title || 'meeting'}-recording.webm`}
                className="im-btn im-btn-outline h-12 px-4 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="im-card p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <NotebookPen className="h-5 w-5 text-[--color-primary]" />
                  <h3 className="font-bold text-[--color-foreground]">Shared Notes</h3>
                </div>
                <span className="im-badge im-badge-blue text-[11px]">Live sync</span>
              </div>
              <textarea
                value={sharedNotes}
                onChange={(event) => handleSharedNotesChange(event.target.value)}
                rows={5}
                className="im-input resize-none"
                placeholder="Capture decisions, blockers, and notes together..."
              />
              <form onSubmit={handleCreateMeetingTask} className="mt-3 flex gap-2">
                <input
                  value={meetingTask}
                  onChange={(event) => setMeetingTask(event.target.value)}
                  className="im-input min-w-0 flex-1"
                  placeholder="Create task from this meeting"
                />
                <button type="submit" className="im-btn im-btn-primary shrink-0 px-4" title="Create task">
                  <Send className="h-4 w-4" />
                </button>
              </form>
              {createdTasks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {createdTasks.map((task, index) => (
                    <div key={`${task}-${index}`} className="rounded-xl border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-xs font-semibold text-[--color-foreground]">
                      {task}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="im-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <WandSparkles className="h-5 w-5 text-[--color-secondary]" />
                <h3 className="font-bold text-[--color-foreground]">AI Report Generator</h3>
              </div>
              <textarea
                value={transcriptDraft}
                onChange={(event) => setTranscriptDraft(event.target.value)}
                rows={4}
                className="im-input resize-none"
                placeholder="Paste transcript or meeting notes"
              />
              <button
                type="button"
                onClick={() => void handleGenerateAIReport()}
                disabled={isGeneratingReport}
                className="im-btn im-btn-secondary mt-3 w-full"
              >
                {isGeneratingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate summary
              </button>
              {aiReport && (
                <div className="mt-4 space-y-3 rounded-xl border border-[--color-border] bg-[--color-surface-2] p-3 text-xs">
                  <p className="font-bold text-[--color-foreground]">{aiReport.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="im-badge im-badge-green">85%+ confidence</span>
                    <span className="im-badge im-badge-purple capitalize">
                      {aiReport.sentiment?.overall || 'neutral'} tone
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={exportReportAsPdfText} className="im-btn im-btn-outline im-btn-sm flex-1">
                      <FileText className="h-3.5 w-3.5" />
                      PDF/Text
                    </button>
                    <button type="button" onClick={exportReportAsCsv} className="im-btn im-btn-outline im-btn-sm flex-1">
                      <Download className="h-3.5 w-3.5" />
                      CSV
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="im-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4.5 w-4.5 text-[--color-primary]" />
                <h3 className="font-bold text-[--color-foreground] text-sm">AI Meeting Intelligence</h3>
              </div>
              <p className="text-xs leading-relaxed text-[--color-text-secondary]">
                Transcription and summaries are generated dynamically. Action items are automatically extracted with assignees, priorities, and deadlines.
              </p>
              <div className="mt-4 rounded-xl bg-[--color-surface-2] border border-[--color-border] p-3 text-xs">
                <p className="font-bold text-[--color-foreground]">Action pattern matching</p>
                <p className="mt-1 text-[--color-text-muted] leading-relaxed">
                  "Nand will complete frontend by Friday" becomes a task assigned to Nand with a Friday deadline.
                </p>
              </div>
            </div>
            <div className="im-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4.5 w-4.5 text-[--color-secondary]" />
                <h3 className="font-bold text-[--color-foreground] text-sm">Meeting Details</h3>
              </div>
              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-4">
                  <dt className="text-[--color-text-muted]">Scheduled</dt>
                  <dd className="font-semibold text-[--color-foreground]">
                    {currentMeeting?.scheduledAt ? formatDateTime(currentMeeting.scheduledAt) : 'Instant'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[--color-text-muted]">Status</dt>
                  <dd className="font-semibold text-[--color-foreground] capitalize">
                    {currentMeeting?.status || 'ongoing'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[--color-text-muted]">Recording</dt>
                  <dd className="font-semibold text-[--color-foreground]">
                    {isRecording ? 'Active' : recordingUrl ? 'Ready to download' : 'Off'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="im-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-[--color-secondary]" />
              <h2 className="text-sm font-bold text-[--color-foreground]">Security Controls</h2>
            </div>
            <div className="space-y-2">
              <ToggleLine
                icon={Lock}
                label="Waiting room"
                checked={Boolean(meetingSettings.waitingRoom || liveSettings.waitingRoom)}
                disabled={!isHost}
                onChange={(checked) => updateLiveSetting('waitingRoom', checked)}
              />
              <ToggleLine
                icon={ShieldCheck}
                label="E2EE toggle"
                checked={Boolean(meetingSettings.endToEndEncryption || liveSettings.endToEndEncryption)}
                disabled={!isHost}
                onChange={(checked) => updateLiveSetting('endToEndEncryption', checked)}
              />
            </div>
            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noreferrer"
              className="im-btn im-btn-outline im-btn-sm mt-3 w-full"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Add Google Calendar
            </a>
          </section>

          {isHost && lobbyRequests.length > 0 && (
            <section className="im-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <LogIn className="h-4.5 w-4.5 text-[--color-warning]" />
                <h2 className="text-sm font-bold text-[--color-foreground]">Waiting Room</h2>
              </div>
              <div className="space-y-2">
                {lobbyRequests.map((request) => (
                  <div key={request.socketId} className="rounded-xl border border-[--color-border] bg-[--color-surface-2] p-3">
                    <p className="text-xs font-bold text-[--color-foreground]">{request.userName}</p>
                    <button
                      type="button"
                      onClick={() => approveLobbyRequest(request)}
                      className="im-btn im-btn-primary im-btn-sm mt-2 w-full"
                    >
                      Admit
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {Object.keys(raisedHands).length > 0 && (
            <section className="im-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Hand className="h-4.5 w-4.5 text-amber-500" />
                <h2 className="text-sm font-bold text-[--color-foreground]">Raised Hands</h2>
              </div>
              <div className="space-y-2">
                {Object.values(raisedHands).map((hand) => (
                  <div key={hand.userId} className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                    {hand.userName}
                    <Hand className="h-3.5 w-3.5" />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="im-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[--color-primary]" />
                <h2 className="font-bold text-[--color-foreground] text-sm">Teammates</h2>
              </div>
              <span className="im-badge im-badge-blue text-[11px]">
                {activeParticipantCount}
              </span>
            </div>
            <div className="space-y-2">
              {participantRoster.map((participant) => (
                <div
                  key={`${participant.userId}-${participant.socketId}`}
                  className="flex items-center justify-between gap-3 rounded-xl bg-[--color-surface-2] border border-[--color-border] px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[10px] font-bold text-white shadow-xs">
                      {getInitials(participant.userName.split(' ')[0] || 'T', participant.userName.split(' ')[1] || 'M')}
                    </div>
                    <span className="truncate text-xs font-semibold text-[--color-foreground]">
                      {participant.userName}
                    </span>
                  </div>
                  <span
                    className={`im-badge text-[10px] ${
                      participant.status === 'joined' ? 'im-badge-green' : 'im-badge-gray'
                    }`}
                  >
                    {participant.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <form onSubmit={handleSwitchMeeting} className="im-card p-4">
            <h2 className="font-bold text-[--color-foreground] text-sm">Join another meeting</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={switchCode}
                onChange={(event) => setSwitchCode(event.target.value)}
                placeholder="Code or link"
                className="im-input h-9 px-3 text-xs flex-1 min-w-0"
              />
              <button type="submit" className="im-btn im-btn-secondary h-9 px-4 text-xs shrink-0">
                Join
              </button>
            </div>
          </form>

          <ChatPanel
            compact
            meetingId={currentMeeting?._id}
            title="Meeting Chat"
            subtitle="Live links, notes, and session action items."
          />
        </aside>
      </div>
    </div>
  );
}

function ToggleLine({
  icon: Icon,
  label,
  checked,
  onChange,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-70' : ''}`}>
      <span className="flex min-w-0 items-center gap-2 font-semibold text-[--color-foreground]">
        <Icon className="h-4 w-4 shrink-0 text-[--color-primary]" />
        <span className="truncate">{label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[--color-primary]"
      />
    </label>
  );
}

function formatMeetingClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
