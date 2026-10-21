import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Play,
  Pause,
  Scissors,
  Sliders,
  Flame,
  FileCode,
  Film
} from 'lucide-react';
import {
  StreamHighlight,
  HighlightDetectorOptions,
  AudioEnergyPoint
} from './types';
import {
  DEFAULT_DETECTOR_OPTIONS,
  decodeAudioFromFile,
  analyzeAudioEnergy
} from './core/audio-analyzer';
import { generateHighlights } from './core/clip-segmenter';
import {
  generateCMX3600EDL,
  generateGardenCutPackage,
  downloadTextFile
} from './core/edl-exporter';
import { WaveformHeatmap } from './components/WaveformHeatmap';
import { ClipCard } from './components/ClipCard';
import { DetectorSettingsModal } from './components/DetectorSettingsModal';

export const App: React.FC = () => {
  const [options, setOptions] = useState<HighlightDetectorOptions>(DEFAULT_DETECTOR_OPTIONS);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [streamName, setStreamName] = useState<string>('twitch_vod_session.mp4');
  const [duration, setDuration] = useState<number>(300); // 5 min demo default
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const [energyPoints, setEnergyPoints] = useState<AudioEnergyPoint[]>([]);
  const [highlights, setHighlights] = useState<StreamHighlight[]>([]);
  const [threshold, setThreshold] = useState<number>(0);
  const [filterTab, setFilterTab] = useState<'all' | 'approved' | 'rejected'>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rawAudioBufferRef = useRef<AudioBuffer | null>(null);

  // Generate synthetic demo stream analysis
  const loadDemoData = () => {
    const demoDuration = 300; // 5 minutes
    setDuration(demoDuration);
    setStreamName('demo_stream_apex_legends.mp4');

    const points: AudioEnergyPoint[] = [];
    const totalWindows = Math.floor(demoDuration / 0.5);

    for (let i = 0; i < totalWindows; i++) {
      const timeSec = i * 0.5;
      // Base chatter noise
      let rms = 0.08 + Math.random() * 0.06;

      // Peak 1: Screaming clutch win at 45s (lasting ~8s)
      if (timeSec >= 42 && timeSec <= 50) {
        rms += 0.65 + Math.random() * 0.2;
      }
      // Peak 2: Jumpscare reaction at 145s
      if (timeSec >= 143 && timeSec <= 150) {
        rms += 0.72 + Math.random() * 0.25;
      }
      // Peak 3: Hysterical laugh fit at 235s
      if (timeSec >= 232 && timeSec <= 242) {
        rms += 0.58 + Math.random() * 0.22;
      }

      const db = 20 * Math.log10(Math.max(0.0001, rms));
      points.push({ timeSec, rms, db, isPeak: false });
    }

    // Statistical mean & threshold
    const sum = points.reduce((acc, p) => acc + p.rms, 0);
    const mean = sum / points.length;
    const variance = points.reduce((acc, p) => acc + Math.pow(p.rms - mean, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);
    const thresh = mean + options.thresholdMultiplier * stdDev;
    setThreshold(thresh);

    points.forEach((p) => {
      if (p.rms >= thresh) p.isPeak = true;
    });

    setEnergyPoints(points);
    const generatedClips = generateHighlights(points, demoDuration, mean, stdDev, options);
    setHighlights(generatedClips);
  };

  useEffect(() => {
    loadDemoData();
  }, []);

  // Time update listener
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Auto-pause if active clip ended
      if (activeClipId) {
        const activeClip = highlights.find((h) => h.id === activeClipId);
        if (activeClip && video.currentTime >= activeClip.endTime) {
          video.pause();
          setIsPlaying(false);
          setActiveClipId(null);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 300);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [activeClipId, highlights]);

  // Handle uploaded video file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStreamName(file.name);
    setVideoSrc(URL.createObjectURL(file));
    setIsAnalyzing(true);

    try {
      const audioBuffer = await decodeAudioFromFile(file);
      rawAudioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);

      const { energyPoints: points, meanRms, stdDevRms, threshold: thresh } = analyzeAudioEnergy(
        audioBuffer,
        options
      );

      setEnergyPoints(points);
      setThreshold(thresh);

      const clips = generateHighlights(points, audioBuffer.duration, meanRms, stdDevRms, options);
      setHighlights(clips);
    } catch (err) {
      console.error('Audio analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reAnalyzeCurrentStream = () => {
    if (rawAudioBufferRef.current) {
      const audioBuffer = rawAudioBufferRef.current;
      const { energyPoints: points, meanRms, stdDevRms, threshold: thresh } = analyzeAudioEnergy(
        audioBuffer,
        options
      );
      setEnergyPoints(points);
      setThreshold(thresh);
      const clips = generateHighlights(points, audioBuffer.duration, meanRms, stdDevRms, options);
      setHighlights(clips);
    } else {
      loadDemoData();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
    setCurrentTime(time);
  };

  const playClip = (clip: StreamHighlight) => {
    const video = videoRef.current;
    setActiveClipId(clip.id);
    handleSeek(clip.startTime);
    if (video) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const setClipStatus = (id: string, status: 'approved' | 'rejected') => {
    setHighlights((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
  };

  // Export actions
  const handleExportGardenCut = () => {
    const approved = highlights.filter((h) => h.status === 'approved');
    const pkg = generateGardenCutPackage(streamName, duration, approved);
    downloadTextFile(
      JSON.stringify(pkg, null, 2),
      `${streamName.replace(/\.[^/.]+$/, '')}_gardencut_highlights.json`,
      'application/json'
    );
  };

  const handleExportEDL = () => {
    const approved = highlights.filter((h) => h.status === 'approved');
    const edlText = generateCMX3600EDL(streamName, approved);
    downloadTextFile(edlText, `${streamName.replace(/\.[^/.]+$/, '')}_timeline.edl`, 'text/plain');
  };

  const approvedCount = highlights.filter((h) => h.status === 'approved').length;
  const filteredHighlights = highlights.filter((h) => {
    if (filterTab === 'approved') return h.status === 'approved';
    if (filterTab === 'rejected') return h.status === 'rejected';
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-xl shadow-lg shadow-amber-950/40">
            🔥
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Garden Stream Highlights
              <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                Senior Acoustic AI
              </span>
            </h1>
            <p className="text-xs text-zinc-400">
              VOD Excitement Clip Miner & Dynamic Heatmap (Web & Android)
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="video/*,audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            Upload VOD
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
          >
            <Sliders className="w-4 h-4 text-zinc-400" />
            Sensitivity
          </button>

          <button
            onClick={handleExportEDL}
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
            title="Export standard CMX 3600 EDL for Premiere / DaVinci"
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            CMX 3600 EDL
          </button>

          <button
            onClick={handleExportGardenCut}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-950/50"
            title="Export approved clips to GardenCut timeline"
          >
            <Scissors className="w-4 h-4" />
            Send to GardenCut ({approvedCount})
          </button>
        </div>
      </header>

      {/* Main Studio Grid */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Excitement Heatmap Visualizer */}
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-md flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">FILE:</span>
              <span className="text-xs font-semibold text-zinc-200">{streamName}</span>
              <span className="text-[10px] font-mono text-zinc-500">
                ({(duration / 60).toFixed(1)} min • {energyPoints.length} analysis windows)
              </span>
            </div>
            {isAnalyzing && (
              <span className="text-xs text-amber-400 font-mono animate-pulse">
                ⚡ Acoustic DSP Processing...
              </span>
            )}
          </div>

          <WaveformHeatmap
            energyPoints={energyPoints}
            highlights={highlights}
            currentTime={currentTime}
            totalDuration={duration}
            onSeek={handleSeek}
            threshold={threshold}
          />
        </div>

        {/* Video Player & Clustered Clips Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Player & Time Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center">
              {videoSrc ? (
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <div className="text-center p-6 flex flex-col items-center gap-2 text-zinc-500">
                  <Film className="w-12 h-12 text-zinc-700" />
                  <div className="text-sm font-medium text-zinc-400">Interactive Demo Mode Active</div>
                  <div className="text-xs max-w-sm">
                    Upload your own Twitch/YouTube VOD or click any detected clip on the right to preview acoustic excitement triggers.
                  </div>
                </div>
              )}
            </div>

            {/* Playback Transport */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center transition shrink-0 shadow-md"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 300}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                  <span>Current: {currentTime.toFixed(1)}s</span>
                  <span>Duration: {duration.toFixed(1)}s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detected Highlights List */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-mono font-semibold uppercase text-zinc-300">
                  Detected Clips ({highlights.length})
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-lg text-[10px] font-mono">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2 py-0.5 rounded ${
                    filterTab === 'all' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400'
                  }`}
                >
                  All ({highlights.length})
                </button>
                <button
                  onClick={() => setFilterTab('approved')}
                  className={`px-2 py-0.5 rounded ${
                    filterTab === 'approved' ? 'bg-emerald-600 text-white font-semibold' : 'text-zinc-400'
                  }`}
                >
                  Approved ({approvedCount})
                </button>
                <button
                  onClick={() => setFilterTab('rejected')}
                  className={`px-2 py-0.5 rounded ${
                    filterTab === 'rejected' ? 'bg-red-600 text-white font-semibold' : 'text-zinc-400'
                  }`}
                >
                  Rejected
                </button>
              </div>
            </div>

            {/* Clips Container */}
            <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredHighlights.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  No clips match the selected filter.
                </div>
              ) : (
                filteredHighlights.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    isActive={activeClipId === clip.id}
                    onPlay={playClip}
                    onApprove={(id) => setClipStatus(id, 'approved')}
                    onReject={(id) => setClipStatus(id, 'rejected')}
                  />
                ))
              )}
            </div>

            {/* Quick Bulk Action Bar */}
            <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
              <span className="text-[11px] font-mono">
                Shortcuts: <kbd className="bg-zinc-800 px-1 rounded">A</kbd> Approve • <kbd className="bg-zinc-800 px-1 rounded">D</kbd> Reject
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHighlights((prev) => prev.map((c) => ({ ...c, status: 'approved' })))}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  Approve All
                </button>
                <span>•</span>
                <button
                  onClick={() => setHighlights((prev) => prev.map((c) => ({ ...c, status: 'rejected' })))}
                  className="text-[11px] text-red-400 hover:underline"
                >
                  Reject All
                </button>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Settings Modal */}
      <DetectorSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        options={options}
        onChange={setOptions}
        onReAnalyze={reAnalyzeCurrentStream}
      />
    </div>
  );
};

export default App;
