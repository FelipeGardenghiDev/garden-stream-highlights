import React from 'react';
import { HighlightDetectorOptions } from '../types';
import { Sliders, X } from 'lucide-react';

interface DetectorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: HighlightDetectorOptions;
  onChange: (options: HighlightDetectorOptions) => void;
  onReAnalyze: () => void;
}

export const DetectorSettingsModal: React.FC<DetectorSettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChange,
  onReAnalyze,
}) => {
  if (!isOpen) return null;

  const update = <K extends keyof HighlightDetectorOptions>(
    key: K,
    val: HighlightDetectorOptions[K]
  ) => {
    onChange({ ...options, [key]: val });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-zinc-100">Excitement Detection Sensitivity</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Multiplier */}
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
            <div className="flex justify-between font-medium">
              <span>Threshold Multiplier (σ Standard Deviation)</span>
              <span className="font-mono text-emerald-400">{options.thresholdMultiplier}x σ</span>
            </div>
            <input
              type="range"
              min={1.2}
              max={3.5}
              step={0.1}
              value={options.thresholdMultiplier}
              onChange={(e) => update('thresholdMultiplier', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg accent-emerald-500"
            />
            <span className="text-[10px] text-zinc-400">
              Higher = fewer, more extreme screams/reactions. Lower = more candidate moments.
            </span>
          </div>

          {/* Lead & Trail */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <span className="font-medium">Lead Context Time</span>
              <span className="font-mono text-cyan-400">{options.leadTimeSec}s before</span>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={options.leadTimeSec}
                onChange={(e) => update('leadTimeSec', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg accent-cyan-500"
              />
            </div>

            <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <span className="font-medium">Reaction Trail Time</span>
              <span className="font-mono text-cyan-400">{options.trailTimeSec}s after</span>
              <input
                type="range"
                min={10}
                max={45}
                step={1}
                value={options.trailTimeSec}
                onChange={(e) => update('trailTimeSec', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg accent-cyan-500"
              />
            </div>
          </div>

          {/* Min & Max Duration */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <span className="font-medium">Min Duration</span>
              <span className="font-mono text-zinc-300">{options.minDurationSec}s</span>
              <input
                type="range"
                min={10}
                max={30}
                step={1}
                value={options.minDurationSec}
                onChange={(e) => update('minDurationSec', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg accent-zinc-400"
              />
            </div>

            <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <span className="font-medium">Max Duration</span>
              <span className="font-mono text-zinc-300">{options.maxDurationSec}s</span>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={options.maxDurationSec}
                onChange={(e) => update('maxDurationSec', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg accent-zinc-400"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              onReAnalyze();
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
          >
            Re-Analyze Stream
          </button>
        </div>
      </div>
    </div>
  );
};
