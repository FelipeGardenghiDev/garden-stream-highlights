import { describe, it, expect } from 'vitest';
import { analyzeAudioEnergy, DEFAULT_DETECTOR_OPTIONS } from '../src/core/audio-analyzer';
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

    const highlights = generateHighlights(energyPoints, 60, 0.1, 0.25, options);

    expect(highlights.length).toBe(1);
    const clip = highlights[0];
    expect(clip.peakTime).toBe(30);
    expect(clip.startTime).toBeLessThanOrEqual(20);
    expect(clip.endTime).toBeGreaterThanOrEqual(45);
    expect(clip.intensityScore).toBeGreaterThanOrEqual(50);
  });
});

describe('Garden Stream Highlights - CMX 3600 EDL & GardenCut Exporters', () => {
  const sampleClips: StreamHighlight[] = [
    {
      id: 'clip_1',
      peakTime: 45,
      startTime: 30,
      endTime: 65,
      duration: 35,
      intensityScore: 92,
      status: 'approved',
      title: 'Victory Scream',
    },
  ];

  it('generates compliant CMX 3600 EDL formatting', () => {
    const edl = generateCMX3600EDL('Apex_VOD', sampleClips);

    expect(edl).toContain('TITLE: APEX_VOD');
    expect(edl).toContain('FCM: NON-DROP FRAME');
    expect(edl).toContain('001  AX  V     C');
    expect(edl).toContain('00:00:30:00'); // SMPTE source in
    expect(edl).toContain('00:01:05:00'); // SMPTE source out
  });

  it('generates GardenCut JSON export package', () => {
    const pkg = generateGardenCutPackage('Stream_VOD', 1800, sampleClips);

    expect(pkg.projectName).toBe('Stream_VOD');
    expect(pkg.totalApproved).toBe(1);
    expect(pkg.clips[0].title).toBe('Victory Scream');
    expect(pkg.exportedAt).toBeDefined();
  });
});
