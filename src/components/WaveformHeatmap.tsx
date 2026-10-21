import React, { useRef, useEffect } from 'react';
import { AudioEnergyPoint, StreamHighlight } from '../types';

interface WaveformHeatmapProps {
  energyPoints: AudioEnergyPoint[];
  highlights: StreamHighlight[];
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  threshold?: number;
}

export const WaveformHeatmap: React.FC<WaveformHeatmapProps> = ({
  energyPoints,
  highlights,
  currentTime,
  totalDuration,
  onSeek,
  threshold,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || energyPoints.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const maxRms = Math.max(...energyPoints.map((p) => p.rms), 0.01);
    const sliceWidth = width / energyPoints.length;

    // 1. Draw Waveform Heatmap bars
    for (let i = 0; i < energyPoints.length; i++) {
      const point = energyPoints[i];
      const norm = Math.min(1, point.rms / maxRms);
      const barH = norm * (height - 20);
      const x = i * sliceWidth;
      const y = height - barH;

      // Color coding: Blue (calm) -> Yellow (active) -> Red/Orange (intense peak)
      if (point.isPeak) {
        ctx.fillStyle = '#ef4444'; // Red
      } else if (norm > 0.6) {
        ctx.fillStyle = '#f59e0b'; // Amber
      } else if (norm > 0.3) {
        ctx.fillStyle = '#10b981'; // Emerald
      } else {
        ctx.fillStyle = '#3b82f6'; // Blue
      }

      ctx.fillRect(x, y, Math.max(1, sliceWidth), barH);
    }

    // 2. Draw Threshold Line
    if (threshold) {
      const threshNorm = Math.min(1, threshold / maxRms);
      const threshY = height - threshNorm * (height - 20);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, threshY);
      ctx.lineTo(width, threshY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Highlight Segments overlay
    for (const hl of highlights) {
      const startX = (hl.startTime / totalDuration) * width;
      const endX = (hl.endTime / totalDuration) * width;
      const peakX = (hl.peakTime / totalDuration) * width;
      const segWidth = endX - startX;

      // Highlight Region Box
      ctx.fillStyle = hl.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(startX, 0, segWidth, height);

      // Border outline
      ctx.strokeStyle = hl.status === 'approved' ? '#10b981' : '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(startX, 0, segWidth, height);

      // Peak marker icon line
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(peakX - 1.5, 0, 3, height);
    }

    // 4. Playhead cursor
    const playheadX = (currentTime / (totalDuration || 1)) * width;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead arrow on top
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(playheadX - 5, 0);
    ctx.lineTo(playheadX + 5, 0);
    ctx.lineTo(playheadX, 7);
    ctx.fill();
  }, [energyPoints, highlights, currentTime, totalDuration, threshold]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || totalDuration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * totalDuration);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
        <span className="flex items-center gap-2">
          <span>EXCITEMENT HEATMAP</span>
          <span className="text-[10px] text-zinc-500">• Blue (Calm) • Amber (Active) • Red (Climax)</span>
        </span>
        <span className="text-emerald-400">Click timeline to seek</span>
      </div>
      <div className="w-full h-24 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 shadow-inner">
        <canvas
          ref={canvasRef}
          width={1000}
          height={96}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-pointer block"
        />
      </div>
    </div>
  );
};
