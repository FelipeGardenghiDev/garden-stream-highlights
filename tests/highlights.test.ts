import { describe, it, expect } from 'vitest';
import {
  analyzeAudioEnergy,
  DEFAULT_DETECTOR_OPTIONS,
  calculateDecibelsFromRms,
  calculateZScore,
  formatDbThreshold
} from '../src/core/audio-analyzer';
import { generateHighlights } from '../src/core/clip-segmenter';
import { generateCMX3600EDL, generateGardenCutPackage } from '../src/core/edl-exporter';
import { StreamHighlight } from '../src/types';

describe('Garden Stream Highlights - Acoustic Excitement Analyzer', () => {
  // Mock synthetic AudioBuffer for test
  function createSyntheticAudioBuffer(durationSec: number, sampleRate: number = 44100): AudioBuffer {
    const totalSamples = durationSec * sampleRate;
    const channelData = new Float32Array(totalSamples);

    // Baseline calm audio: 0.05 amplitude
    for (let i = 0; i < totalSamples; i++) {
      channelData[i] = (Math.random() * 2 - 1) * 0.05;
    }

    // Scream / excitement spike at 20s to 24s: 0.9 amplitude
    const spikeStart = 20 * sampleRate;
    const spikeEnd = 24 * sampleRate;
    for (let i = spikeStart; i < spikeEnd; i++) {
      channelData[i] = (Math.random() * 2 - 1) * 0.9;
    }

    return {
      numberOfChannels: 1,
      length: totalSamples,
      sampleRate,
      duration: durationSec,
      getChannelData: () => channelData,
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;
  }

  it('accurately calculates decibels, z-scores, and format readouts', () => {
    expect(calculateDecibelsFromRms(1.0)).toBe(0);
    expect(calculateDecibelsFromRms(0.1)).toBeCloseTo(-20, 0);
    expect(calculateDecibelsFromRms(0.000001)).toBe(-100);

    expect(calculateZScore(10, 5, 2)).toBe(2.5);
    expect(calculateZScore(5, 5, 2)).toBe(0);
    expect(calculateZScore(5, 5, 0)).toBe(0);

    expect(formatDbThreshold(1.0)).toContain('0.0 dBFS');
    expect(formatDbThreshold(0.1)).toContain('-20.0 dBFS');
  });

  it('accurately identifies excitement peak anomaly via RMS and standard deviation', () => {
    const mockBuffer = createSyntheticAudioBuffer(40);
    const result = analyzeAudioEnergy(mockBuffer, DEFAULT_DETECTOR_OPTIONS);

    expect(result.energyPoints.length).toBeGreaterThan(0);
    expect(result.meanRms).toBeGreaterThan(0);
    expect(result.stdDevRms).toBeGreaterThan(0);
    expect(result.threshold).toBeGreaterThan(result.meanRms);

    // Peak points should be detected around 20s - 24s
    const detectedPeaks = result.energyPoints.filter((p) => p.isPeak);
    expect(detectedPeaks.length).toBeGreaterThan(0);

    const peakTimes = detectedPeaks.map((p) => p.timeSec);
    const hasSpikeAt20s = peakTimes.some((t) => t >= 19.5 && t <= 24.5);
    expect(hasSpikeAt20s).toBe(true);
  });
});

describe('Garden Stream Highlights - Clip Segmenter & Clustering', () => {
  it('clusters peaks into a highlight clip with lead and trail margins', () => {
    const energyPoints = [
      { timeSec: 10, rms: 0.05, db: -26, isPeak: false },
      { timeSec: 20, rms: 0.05, db: -26, isPeak: false },
      { timeSec: 30, rms: 0.85, db: -1.4, isPeak: true }, // Peak
      { timeSec: 31, rms: 0.82, db: -1.7, isPeak: true },
      { timeSec: 40, rms: 0.05, db: -26, isPeak: false },
    ];

    const options = {
      ...DEFAULT_DETECTOR_OPTIONS,
      leadTimeSec: 10,
      trailTimeSec: 15,
      minDurationSec: 15,
      maxDurationSec: 45,
    };

    const clips = generateHighlights(energyPoints, 60, 0.1, 0.05, options);
    expect(clips.length).toBe(1);

    const clip = clips[0];
    expect(clip.startTime).toBeLessThan(30);
    expect(clip.endTime).toBeGreaterThan(31);
    expect(clip.status).toBe('approved');
    expect(clip.intensityScore).toBeGreaterThan(50);
  });
});

describe('Garden Stream Highlights - EDL Exporter', () => {
  const mockClips: StreamHighlight[] = [
    {
      id: 'clip_1',
      startTime: 10.0,
      endTime: 25.0,
      duration: 15.0,
      peakTime: 18.0,
      intensityScore: 85,
      status: 'approved',
      title: 'Pico de Emoção #1',
    },
  ];

  it('generates standard CMX 3600 EDL for Premiere / DaVinci Resolve', () => {
    const edl = generateCMX3600EDL('live_stream', mockClips);

    expect(edl).toContain('TITLE: LIVE_STREAM');
    expect(edl).toContain('FCM: NON-DROP FRAME');
    expect(edl).toContain('001  AX  V     C');
    expect(edl).toContain('* FROM CLIP NAME: Pico de Emoção #1');
  });

  it('generates GardenCut project package format', () => {
    const pkg = generateGardenCutPackage('live_stream.mp4', 120, mockClips);

    expect(pkg.projectName).toContain('live_stream');
    expect(pkg.totalApproved).toBe(1);
    expect(pkg.clips.length).toBe(1);
    expect(pkg.clips[0].title).toBe('Pico de Emoção #1');
  });
});
