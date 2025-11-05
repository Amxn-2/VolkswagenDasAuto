import { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import HazardNotifier from './HazardNotifier';
import NearbyHazardNotifier from './NearbyHazardNotifier';
import EmergencyBrakeNotifier from './EmergencyBrakeNotifier';

export default function LiveMode() {
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const alertRef = useRef(null);
  const cooldownRef = useRef(null);
  const alertSoundRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hazardDetected, setHazardDetected] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hazardDistances, setHazardDistances] = useState([]);
  const [driverLaneHazardCount, setDriverLaneHazardCount] = useState(0);
  const [detectionMode, setDetectionMode] = useState('live');
  const [videoProgress, setVideoProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [fps, setFps] = useState(0);
  const frameCounterRef = useRef({ count: 0, lastTs: performance.now() });

  // Initialize alert sound
  useEffect(() => {
    alertSoundRef.current = new Audio('/alert.mp3');
    alertSoundRef.current.loop = true;
    
    return () => {
      if (alertSoundRef.current) {
        alertSoundRef.current.pause();
        alertSoundRef.current = null;
      }
    };
  }, []);

  // Get current location and send to WebSocket
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          
          // Send GPS to WebSocket server if connected
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              gps: newLocation
            }));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.warning("Location access is needed for hazard reporting");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,  // Accept cached position up to 5 seconds old
          timeout: 10000
        }
      );
    } else {
      toast.warning("Geolocation is not supported by this browser");
    }
  }, []);

  const connectWebSocket = (retry = 0) => {
    if (wsRef.current) {
      try { wsRef.current.onopen = null; wsRef.current.onmessage = null; wsRef.current.onerror = null; wsRef.current.onclose = null; } catch {}
      try { wsRef.current.close(); } catch {}
    }

    // Use proxy in development (Vite dev server), direct connection in production
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let wsURL;
    
    if (isDev) {
      // In dev, use the Vite proxy
      wsURL = window.location.origin.replace(/^http/, 'ws') + '/ws';
    } else {
      // In production, connect directly to backend
      wsURL = 'ws://127.0.0.1:8000/ws';
    }
    
    wsRef.current = new WebSocket(wsURL);
    // Prefer ArrayBuffer to cut Blob overhead
    try { wsRef.current.binaryType = 'arraybuffer'; } catch {}

    wsRef.current.onopen = () => {
      setIsConnected(true);
      
      // Send GPS location to server when WebSocket opens
      if (currentLocation) {
        wsRef.current.send(JSON.stringify({
          gps: {
            lat: currentLocation.lat,
            lng: currentLocation.lng
          }
        }));
      }
    };

    wsRef.current.onmessage = (e) => {
      if (typeof e.data === 'string') {
        try {
          // Ignore keepalive pings
          if (e.data === 'ping') return;
          const parsedData = JSON.parse(e.data);
          const driverLaneHazardCount = parsedData.driver_lane_hazard_count;
          const hazardDistances = parsedData.hazard_distances || [];
          setHazardDetected({ type: parsedData.hazard_type });
          setDriverLaneHazardCount(driverLaneHazardCount);
          setHazardDistances(hazardDistances);
          
          // Update mode and video progress if present
          if (parsedData.mode) {
            setDetectionMode(parsedData.mode);
          }
          if (parsedData.video_progress !== undefined) {
            setVideoProgress(parsedData.video_progress);
          }
    
          if (driverLaneHazardCount > 0) {
            if (!alertRef.current) {
              alertRef.current = toast.warning(`⚠️ Road Hazard Detected in Your Lane! \n
                Reducing Speed ......
                `, {
                autoClose: false,
                closeOnClick: false,
                draggable: false,
                onOpen: () => {
                  if (alertSoundRef.current) {
                    alertSoundRef.current.play().catch(err => console.error("Error playing sound:", err));
                  }
                },
                onClose: () => {
                  if (alertSoundRef.current) {
                    alertSoundRef.current.pause();
                    alertSoundRef.current.currentTime = 0;
                  }
                }
              });
            }
            if (cooldownRef.current) {
              clearTimeout(cooldownRef.current);
              cooldownRef.current = null;
            }
          } else {
            if (!cooldownRef.current) {
              cooldownRef.current = setTimeout(() => {
                if (alertRef.current) {
                  toast.dismiss(alertRef.current);
                  alertRef.current = null;
                  if (alertSoundRef.current) {
                    alertSoundRef.current.pause();
                    alertSoundRef.current.currentTime = 0;
                  }
                }
                cooldownRef.current = null;
              }, 3000);
            }
          }
        } catch (err) {
          console.error("WebSocket JSON Error:", err);
        }
      } else if (e.data instanceof ArrayBuffer || e.data instanceof Blob) {
        const blob = e.data instanceof Blob ? e.data : new Blob([e.data], { type: 'image/jpeg' });
        let canvas = document.getElementById('processed-canvas');
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.id = 'processed-canvas';
          canvas.className = 'processed-feed';
          videoRef.current.after(canvas);
        }
        const ctx = canvas.getContext('2d');
        // Use createImageBitmap for faster decode and draw
        createImageBitmap(blob).then((bitmap) => {
          if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();

          // FPS estimation
          const fc = frameCounterRef.current;
          fc.count += 1;
          const now = performance.now();
          if (now - fc.lastTs >= 1000) {
            setFps(fc.count);
            fc.count = 0;
            fc.lastTs = now;
          }
        }).catch(() => {
          // Fallback path if createImageBitmap not supported
          const img = new Image();
          img.onload = () => {
            if (canvas.width !== img.width || canvas.height !== img.height) {
              canvas.width = img.width;
              canvas.height = img.height;
            }
            ctx.drawImage(img, 0, 0);

            const fc = frameCounterRef.current;
            fc.count += 1;
            const now = performance.now();
            if (now - fc.lastTs >= 1000) {
              setFps(fc.count);
              fc.count = 0;
              fc.lastTs = now;
            }
          };
          img.src = URL.createObjectURL(blob);
        });
      }
    };

    wsRef.current.onerror = () => {
      if (retry % 10 === 0) {
        console.error("WebSocket error. Attempting to reconnect...");
      }
      setIsConnected(false);
    };

    wsRef.current.onclose = () => {
      const base = 1000; // 1s
      const maxDelay = 30000; // 30s
      const delay = Math.min(maxDelay, Math.round(base * Math.pow(2, Math.min(retry, 6)) + Math.random() * 500));
      if (retry % 3 === 0) {
        console.warn(`WebSocket closed. Reconnecting in ${Math.round(delay/1000)}s...`);
      }
      setIsConnected(false);
      setTimeout(() => connectWebSocket(retry + 1), delay);
    };
  };

  // Fetch current mode on mount
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await axios.get('/api/get-mode');
        setDetectionMode(response.data.mode);
      } catch (error) {
        console.error('Error fetching mode:', error);
      }
    };
    fetchMode();
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      const processedImg = document.getElementById('processed-feed');
      if (processedImg) {
        if (processedImg.src) {
          URL.revokeObjectURL(processedImg.src);
        }
        processedImg.remove();
      }
    };
  }, []);

  const handleNotificationSent = (hazard, response) => {
    if (response.success) {
      toast.success(`Hazard reported to authorities (ID: ${response.report_id.substring(0, 8)})`);
    }
  };

  const handleModeSwitch = async (mode) => {
    try {
      const response = await axios.post('/api/set-mode', { mode });
      if (response.data.success) {
        setDetectionMode(mode);
        toast.info(`Switched to ${mode === 'live' ? 'Live Camera' : 'Video File'} mode`);
      }
    } catch (error) {
      console.error('Error switching mode:', error);
      toast.error('Failed to switch mode');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|avi|mov|mkv|webm|flv|wmv)$/i)) {
      toast.error('Unsupported file format. Please upload MP4, AVI, MOV, MKV, WEBM, FLV, or WMV files.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          toast.info(`Uploading: ${percentCompleted}%`);
        },
      });

      if (response.data.success) {
        setDetectionMode('video');
        toast.success(`Video uploaded successfully: ${response.data.filename}`);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const handleStopVideo = async () => {
    try {
      const response = await axios.post('/api/stop-video');
      if (response.data.success) {
        setDetectionMode('live');
        setVideoProgress(0);
        toast.info('Video stopped. Switched to Live Camera mode.');
      }
    } catch (error) {
      console.error('Error stopping video:', error);
      toast.error('Failed to stop video');
    }
  };

  return (
    <div className="max-w-full mx-auto p-5 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <h1 className="text-center mb-5 text-[#2c3e50] text-3xl">Road Hazard Detection</h1>
        <div className="flex gap-2 flex-wrap">
          <span className={`px-2.5 py-1.5 rounded-full text-sm font-semibold ${isConnected ? 'bg-[#e6fff0] text-[#0f9d58] border border-[#b7f0d0]' : 'bg-[#fff5e5] text-[#e67e22] border border-[#ffd8a8]'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className="px-2.5 py-1.5 rounded-full text-sm font-semibold bg-[#eef2f7] text-[#34495e] border border-[#d9e2ec]">
            Mode: {detectionMode === 'live' ? 'Live Camera' : 'Video File'}
          </span>
          {detectionMode === 'video' && (
            <span className="px-2.5 py-1.5 rounded-full text-sm font-semibold bg-[#eef2f7] text-[#34495e] border border-[#d9e2ec]">
              Progress: {videoProgress ? `${videoProgress.toFixed(1)}%` : '—'}
            </span>
          )}
          <span className="px-2.5 py-1.5 rounded-full text-sm font-semibold bg-[#eef2f7] text-[#34495e] border border-[#d9e2ec]">
            FPS: {fps}
          </span>
          <span className={`px-2.5 py-1.5 rounded-full text-sm font-semibold ${driverLaneHazardCount > 0 ? 'bg-[#ffeaea] text-[#d32f2f] border border-[#ffbdbd]' : 'bg-[#e6fff0] text-[#0f9d58] border border-[#b7f0d0]'}`}>
            Lane Hazards: {driverLaneHazardCount}
          </span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex flex-col items-center gap-4 mb-5 p-4 bg-[#f8f9fa] rounded-lg">
        <div className="flex gap-2.5">
          <button
            className={`px-6 py-3 text-base font-bold border-2 rounded-md transition-all duration-300 ${detectionMode === 'live' 
              ? 'bg-[#3498db] text-white border-[#3498db] shadow-md' 
              : 'bg-white text-[#3498db] border-[#3498db] hover:bg-[#3498db] hover:text-white hover:-translate-y-0.5 hover:shadow-md'} ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => handleModeSwitch('live')}
            disabled={uploading}
          >
            📹 Live Camera
          </button>
          <button
            className={`px-6 py-3 text-base font-bold border-2 rounded-md transition-all duration-300 ${detectionMode === 'video' 
              ? 'bg-[#3498db] text-white border-[#3498db] shadow-md' 
              : 'bg-white text-[#3498db] border-[#3498db] hover:bg-[#3498db] hover:text-white hover:-translate-y-0.5 hover:shadow-md'} ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => handleModeSwitch('video')}
            disabled={uploading}
          >
            🎬 Video File
          </button>
        </div>

        {/* File Upload Section */}
        {detectionMode === 'video' && (
          <div className="flex gap-2.5 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="video-upload-input"
              disabled={uploading}
            />
            <label 
              htmlFor="video-upload-input" 
              className="px-6 py-3 text-base font-bold border-2 border-[#27ae60] rounded-md bg-white text-[#27ae60] cursor-pointer transition-all duration-300 inline-block hover:bg-[#27ae60] hover:text-white hover:-translate-y-0.5 hover:shadow-md"
            >
              {uploading ? 'Uploading...' : '📁 Upload Video'}
            </label>
            {detectionMode === 'video' && videoProgress > 0 && (
              <button 
                className="px-6 py-3 text-base font-bold border-2 border-[#e74c3c] rounded-md bg-white text-[#e74c3c] cursor-pointer transition-all duration-300 hover:bg-[#e74c3c] hover:text-white hover:-translate-y-0.5 hover:shadow-md"
                onClick={handleStopVideo}
              >
                ⏹ Stop Video
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status Display */}
      <div className={`text-center mb-5 py-2.5 px-4 rounded font-bold text-white ${detectionMode === 'live' 
        ? 'bg-gradient-to-r from-[#e74c3c] to-[#c0392b]' 
        : 'bg-gradient-to-r from-[#9b59b6] to-[#8e44ad]'}`}>
        {detectionMode === 'live' 
          ? '🔴 Live Camera (YOLO Detection Active)' 
          : `🎬 Video File Mode ${videoProgress > 0 ? `- ${videoProgress.toFixed(1)}%` : ''}`}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="relative rounded-lg overflow-hidden shadow-md bg-white/75 backdrop-blur-md">
          <div className="flex items-center justify-between py-2.5 px-3 font-semibold text-[#2c3e50] border-b border-black/5">
            <span>Processed Stream</span>
          </div>
          <div className="w-full h-[400px] overflow-hidden relative">
            {!isConnected && (
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-[#e6eaf0]/70 via-[#f5f7fa]/90 to-[#e6eaf0]/70 animate-shimmer" />
              </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover rounded-lg border-2 border-[#3498db]"
            />
            <div className="absolute bottom-2.5 right-2.5 bg-black/55 text-white py-1 px-2 rounded-full text-xs flex gap-1.5 items-center">
              <span className={`w-2 h-2 rounded-full inline-block ${isConnected ? 'bg-[#34c759]' : 'bg-[#ff9f0a]'}`} />
              <span>{fps} fps</span>
            </div>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden shadow-md bg-white/75 backdrop-blur-md">
          <div className="flex items-center justify-between py-2.5 px-3 font-semibold text-[#2c3e50] border-b border-black/5">
            <span>Hazard Map</span>
          </div>
          <iframe
            src="/Map.html"
            title="Road Hazard Map"
            className="w-full h-[400px] border-none rounded-lg"
            allowFullScreen
          />
        </div>
      </div>

      <div className="mt-3.5 flex gap-4 items-center text-[#4a5568]">
        <div className="flex gap-2 items-center"><span className="w-3.5 h-3.5 rounded bg-[#00ff00] inline-block" /> Road hazards</div>
        <div className="flex gap-2 items-center"><span className="w-3.5 h-3.5 rounded bg-[#00ffff] inline-block" /> Standard objects</div>
      </div>

      <HazardNotifier 
        isConnected={isConnected}
        hazardDetected={hazardDetected}
        currentLocation={currentLocation}
        onNotificationSent={handleNotificationSent}
      />

      {/* NearbyHazardNotifier now handles pothole notifications */}
      <NearbyHazardNotifier currentLocation={currentLocation} />

      <EmergencyBrakeNotifier 
        hazardDistances={hazardDistances}
        driverLaneHazardCount={driverLaneHazardCount}
      />
      
      <ToastContainer />
    </div>
  );
}