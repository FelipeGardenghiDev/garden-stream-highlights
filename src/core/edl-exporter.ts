import { StreamHighlight, HighlightsExportPackage } from '../types';

/**
 * Converts seconds to SMPTE Timecode HH:MM:SS:FF (at 30 fps)
 */
function secondsToSMPTE(sec: number, fps: number = 30): string {
  const totalFrames = Math.floor(sec * fps);
  const frames = totalFrames % fps;
  const totalSeconds = Math.floor(totalFrames / fps);
  const s = totalSeconds % 60;
  const m = Math.floor(totalSeconds / 60) % 60;
  const h = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

/**
 * Generates industry-standard CMX 3600 Edit Decision List (EDL) text
 * Supported by Premiere Pro, DaVinci Resolve, Final Cut Pro.
 */
export function generateCMX3600EDL(
  projectName: string,
  clips: StreamHighlight[],
  tapeName: string = 'AX'
): string {
  let edl = `TITLE: ${projectName.toUpperCase()}\n`;
  edl += `FCM: NON-DROP FRAME\n\n`;

  let recordTimecodeSec = 0;

  clips.forEach((clip, index) => {
    const eventNum = String(index + 1).padStart(3, '0');
    const srcIn = secondsToSMPTE(clip.startTime);
    const srcOut = secondsToSMPTE(clip.endTime);

    const recIn = secondsToSMPTE(recordTimecodeSec);
    recordTimecodeSec += clip.duration;
    const recOut = secondsToSMPTE(recordTimecodeSec);

    edl += `${eventNum}  ${tapeName}  V     C        ${srcIn} ${srcOut} ${recIn} ${recOut}\n`;
    edl += `* FROM CLIP NAME: ${clip.title} (Peak at ${clip.peakTime}s)\n\n`;
  });

  return edl;
}

/**
 * Generates GardenCut compatible JSON timeline package
 */
export function generateGardenCutPackage(
  projectName: string,
  sourceDuration: number,
  clips: StreamHighlight[]
): HighlightsExportPackage {
  return {
    projectName,
    sourceDuration,
    totalApproved: clips.length,
    clips,
    exportedAt: new Date().toISOString(),
  };
}

export function downloadTextFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
