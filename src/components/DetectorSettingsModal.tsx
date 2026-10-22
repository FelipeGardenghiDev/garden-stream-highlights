import React from 'react';
import { HighlightDetectorOptions } from '../types';
import { Sliders, X, Sparkles, Volume2 } from 'lucide-react';
import { formatDbThreshold } from '../core/audio-analyzer';

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

  const estimatedThresholdDb = formatDbThreshold(0.12 * (options.thresholdMultiplier / 2.2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-zinc-100">Sensibilidade & Limiares Acústicos</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs">
          {/* Z-Score Sensitivity Slider */}
          <div className="flex flex-col gap-1 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60">
            <div className="flex justify-between font-medium">
              <span className="flex items-center gap-1.5 text-zinc-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Sensibilidade Z-Score (Desvios Padrão σ)
              </span>
              <span className="font-mono text-emerald-400 font-bold">Z ≥ +{options.thresholdMultiplier}σ</span>
            </div>
            <input
              type="range"
              min={1.2}
              max={3.5}
              step={0.1}
              value={options.thresholdMultiplier}
              onChange={(e) => update('thresholdMultiplier', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-700 rounded-lg accent-emerald-500 cursor-pointer my-1"
            />
            <div className="flex justify-between items-center text-[11px] pt-1 text-zinc-400 font-mono border-t border-zinc-700/40">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-cyan-400" />
                Limiar sonoro dBFS:
              </span>
              <span className="text-cyan-400 font-bold">{estimatedThresholdDb}</span>
            </div>
            <span className="text-[10px] text-zinc-400">
              Valores altos (+3.0σ) isolam apenas gritos e sustos extremos. Valores baixos (+1.5σ) capturam conversas empolgadas.
            </span>
          </div>

          {/* Lead & Trail */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <span className="font-medium text-zinc-300">Tempo Anterior (Lead)</span>
              <span className="font-mono text-cyan-400 font-semibold">{options.leadTimeSec}s antes do pico</span>
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
              <span className="font-medium text-zinc-300">Tempo Posterior (Trail)</span>
              <span className="font-mono text-cyan-400 font-semibold">{options.trailTimeSec}s de reação</span>
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
              <span className="font-medium text-zinc-300">Duração Mínima</span>
              <span className="font-mono text-zinc-400">{options.minDurationSec} segundos</span>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={options.minDurationSec}
                onChange={(e) => update('minDurationSec', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg accent-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-800/60 border border-zinc-700/60">
              <span className="font-medium text-zinc-300">Duração Máxima</span>
              <span className="font-mono text-zinc-400">{options.maxDurationSec} segundos</span>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={options.maxDurationSec}
                onChange={(e) => update('maxDurationSec', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-700 rounded-lg accent-zinc-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800 pt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-zinc-800 transition text-xs font-medium cursor-pointer"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              onReAnalyze();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-xs transition shadow-lg shadow-emerald-950/40 cursor-pointer"
          >
            Re-analisar Áudio
          </button>
        </div>
      </div>
    </div>
  );
};
