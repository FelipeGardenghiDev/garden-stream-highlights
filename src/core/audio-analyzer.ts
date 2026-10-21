import { AudioEnergyPoint, HighlightDetectorOptions } from '../types';

export const DEFAULT_DETECTOR_OPTIONS: HighlightDetectorOptions = {
  windowSizeSec: 0.5,
  thresholdMultiplier: 2.2,
  leadTimeSec: 15,
  trailTimeSec: 25,
  minDurationSec: 15,
  maxDurationSec: 60,
  minGapBetweenClipsSec: 12,
};

/**
 * Decodes audio from a File / Blob using Web Audio API AudioContext.
 * 100% Free & Client-Side.
 */
export async function decodeAudioFromFile(file: File | Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  try {
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Calculates windowed RMS energy profile and performs statistical anomaly peak detection.
 */
export function analyzeAudioEnergy(
  audioBuffer: AudioBuffer,
  options: HighlightDetectorOptions = DEFAULT_DETECTOR_OPTIONS
): { energyPoints: AudioEnergyPoint[]; meanRms: number; stdDevRms: number; threshold: number } {
  const channelData = audioBuffer.getChannelData(0); // Mono or Left channel
  const sampleRate = audioBuffer.sampleRate;
  const windowSamples = Math.max(128, Math.floor(sampleRate * options.windowSizeSec));
  const totalWindows = Math.floor(channelData.length / windowSamples);

  const energyPoints: AudioEnergyPoint[] = [];
  let sumRms = 0;

  // 1. Calculate RMS for each window
  for (let w = 0; w < totalWindows; w++) {
    const startIdx = w * windowSamples;
    let sumSquares = 0;
    for (let i = 0; i < windowSamples; i++) {
      const sample = channelData[startIdx + i];
      sumSquares += sample * sample;
    }
    const rms = Math.sqrt(sumSquares / windowSamples);
    const db = rms > 0.00001 ? 20 * Math.log10(rms) : -100;
    const timeSec = (w * windowSamples) / sampleRate;

    energyPoints.push({
      timeSec,
      rms,
      db,
      isPeak: false,
    });
    sumRms += rms;
  }

  // 2. Statistical Mean & Standard Deviation
  const meanRms = totalWindows > 0 ? sumRms / totalWindows : 0;
  let sumSquaredDiffs = 0;
  for (let w = 0; w < totalWindows; w++) {
    const diff = energyPoints[w].rms - meanRms;
    sumSquaredDiffs += diff * diff;
  }
  const variance = totalWindows > 1 ? sumSquaredDiffs / (totalWindows - 1) : 0;
  const stdDevRms = Math.sqrt(variance);

  // Dynamic anomaly threshold: mean + k * sigma
  const threshold = meanRms + options.thresholdMultiplier * (stdDevRms || 0.01);

  // 3. Flag peaks
  for (let w = 0; w < totalWindows; w++) {
    if (energyPoints[w].rms >= threshold) {
      energyPoints[w].isPeak = true;
    }
  }

  return { energyPoints, meanRms, stdDevRms, threshold };
}
