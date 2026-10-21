export interface StreamHighlight {
  id: string;
  peakTime: number;      // Ponto exato do pico em segundos
  startTime: number;     // Início com margem de contexto
  endTime: number;       // Término com margem de reação
  duration: number;
  intensityScore: number; // 0 a 100 baseado em desvio padrão de decibéis
  status: 'pending' | 'approved' | 'rejected';
  title: string;
  rmsValue?: number;
}

export interface HighlightDetectorOptions {
  windowSizeSec: number;        // Tamanho da janela RMS (ex: 0.5s)
  thresholdMultiplier: number;  // Multiplicador de desvio padrão (ex: 2.2)
  leadTimeSec: number;          // Segundos antes do pico (ex: 15s)
  trailTimeSec: number;         // Segundos depois do pico (ex: 25s)
  minDurationSec: number;       // Mínimo de duração (ex: 15s)
  maxDurationSec: number;       // Máximo de duração (ex: 60s)
  minGapBetweenClipsSec: number;// Espaçamento mínimo entre clipes (ex: 12s)
}

export interface AudioEnergyPoint {
  timeSec: number;
  rms: number;
  db: number;
  isPeak: boolean;
}

export interface HighlightsExportPackage {
  projectName: string;
  sourceDuration: number;
  totalApproved: number;
  clips: StreamHighlight[];
  exportedAt: string;
}
