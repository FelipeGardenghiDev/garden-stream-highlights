import { AudioEnergyPoint, HighlightDetectorOptions, StreamHighlight } from '../types';

/**
 * Clusters excitement peak points into coherent stream highlight clips.
 */
export function generateHighlights(
  energyPoints: AudioEnergyPoint[],
  totalDurationSec: number,
  meanRms: number,
  stdDevRms: number,
  options: HighlightDetectorOptions
): StreamHighlight[] {
  // 1. Collect all peak points
  const peakPoints = energyPoints.filter((p) => p.isPeak);
  if (peakPoints.length === 0) return [];

  // 2. Form initial raw candidate clips around each peak
  const rawCandidates: { peakTime: number; rms: number; startTime: number; endTime: number }[] = [];

  for (const peak of peakPoints) {
    const rawStart = Math.max(0, peak.timeSec - options.leadTimeSec);
    const rawEnd = Math.min(totalDurationSec, peak.timeSec + options.trailTimeSec);

    rawCandidates.push({
      peakTime: peak.timeSec,
      rms: peak.rms,
      startTime: rawStart,
      endTime: rawEnd,
    });
  }

  // 3. Merge overlapping or closely adjacent candidate clips
  const merged: { peakTime: number; maxRms: number; startTime: number; endTime: number }[] = [];

  for (const candidate of rawCandidates) {
    if (merged.length === 0) {
      merged.push({
        peakTime: candidate.peakTime,
        maxRms: candidate.rms,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
      });
      continue;
    }

    const last = merged[merged.length - 1];
    // Check overlap or gap smaller than minGapBetweenClipsSec
    if (candidate.startTime <= last.endTime + options.minGapBetweenClipsSec) {
      // Extend end time
      last.endTime = Math.max(last.endTime, candidate.endTime);
      // Keep peak with highest RMS
      if (candidate.rms > last.maxRms) {
        last.maxRms = candidate.rms;
        last.peakTime = candidate.peakTime;
      }
    } else {
      merged.push({
        peakTime: candidate.peakTime,
        maxRms: candidate.rms,
        startTime: candidate.startTime,
        endTime: candidate.endTime,
      });
    }
  }

  // 4. Clamp duration and compute intensity score (0-100)
  return merged.map((item, idx) => {
    let dur = item.endTime - item.startTime;

    // Enforce minDuration
    if (dur < options.minDurationSec) {
      const diff = options.minDurationSec - dur;
      item.startTime = Math.max(0, item.startTime - diff / 2);
      item.endTime = Math.min(totalDurationSec, item.endTime + diff / 2);
      dur = item.endTime - item.startTime;
    }

    // Enforce maxDuration (centering on peak)
    if (dur > options.maxDurationSec) {
      item.startTime = Math.max(0, item.peakTime - options.maxDurationSec * 0.4);
      item.endTime = Math.min(totalDurationSec, item.startTime + options.maxDurationSec);
      dur = item.endTime - item.startTime;
    }

    // Z-Score for intensity: how many sigmas above mean
    const zScore = stdDevRms > 0 ? (item.maxRms - meanRms) / stdDevRms : 1;
    // Map zScore (e.g. 2.0 to 5.0) to 60-100 range
    const intensity = Math.min(100, Math.max(20, Math.round(50 + zScore * 12)));

    return {
      id: `highlight_${idx + 1}_${Math.round(item.peakTime)}s`,
      peakTime: Number(item.peakTime.toFixed(1)),
      startTime: Number(item.startTime.toFixed(1)),
      endTime: Number(item.endTime.toFixed(1)),
      duration: Number(dur.toFixed(1)),
      intensityScore: intensity,
      status: 'approved',
      title: `Highlight #${idx + 1} (${intensity}% Intensity)`,
      rmsValue: item.maxRms,
    };
  });
}
