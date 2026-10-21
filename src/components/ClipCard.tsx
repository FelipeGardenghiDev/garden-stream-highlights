import React from 'react';
import { StreamHighlight } from '../types';
import { Play, Check, X, Flame, Clock } from 'lucide-react';

interface ClipCardProps {
  clip: StreamHighlight;
  isActive: boolean;
  onPlay: (clip: StreamHighlight) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  isActive,
  onPlay,
  onApprove,
  onReject,
}) => {
  const getFlameColor = (intensity: number) => {
    if (intensity >= 85) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (intensity >= 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  };

  return (
    <div
      className={`p-3 rounded-xl border transition flex flex-col gap-2 ${
        isActive
          ? 'bg-zinc-800/90 border-emerald-500 shadow-md shadow-emerald-950/30'
          : clip.status === 'rejected'
          ? 'bg-zinc-900/40 border-zinc-800/60 opacity-50'
          : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => onPlay(clip)}
            className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shrink-0 transition shadow"
            title="Preview Clip"
          >
            <Play className="w-4 h-4 ml-0.5" />
          </button>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-zinc-100 truncate">{clip.title}</h4>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono mt-0.5">
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-zinc-500" />
                {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
              </span>
              <span>•</span>
              <span className="text-zinc-300 font-medium">{clip.duration.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Intensity Pill */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono font-semibold ${getFlameColor(
              clip.intensityScore
            )}`}
          >
            <Flame className="w-3 h-3" />
            <span>{clip.intensityScore}%</span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onApprove(clip.id)}
              className={`p-1.5 rounded-lg border transition ${
                clip.status === 'approved'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-zinc-800 text-zinc-400 hover:text-emerald-400 border-zinc-700'
              }`}
              title="Approve Clip [A]"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onReject(clip.id)}
              className={`p-1.5 rounded-lg border transition ${
                clip.status === 'rejected'
                  ? 'bg-red-600 text-white border-red-500'
                  : 'bg-zinc-800 text-zinc-400 hover:text-red-400 border-zinc-700'
              }`}
              title="Reject Clip [D]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
