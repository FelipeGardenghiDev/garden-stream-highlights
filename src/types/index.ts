export interface StreamHighlight {
  id: string;
  peakTime: number;      // Ponto exato do pico em segundos
  startTime: number;     // Início com margem de contexto
  endTime: number;       // Término com margem de reação
  duration: number;
  intensityScore: number; // 0 a 100 baseado em desvio padrão de decibéis
  status: 'pending' | 'approved' | 'rejected';
  title?: string;
}

export interface HighlightDetectorOptions {
  windowSizeSec: number;        // Tamanho da janela RMS (ex: 0.5s)
  thresholdMultiplier: number;  // Multiplicador de desvio padrão (ex: 2.5)
  leadTimeSec: number;          // Segundos antes do pico (ex: 15s)
  trailTimeSec: number;         // Segundos depois do pico (ex: 25s)
  minDurationSec: number;       // Mínimo de duração (ex: 20s)
  maxDurationSec: number;       // Máximo de duração (ex: 60s)
}
