export interface TranscriptLine {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResponse {
  transcript: TranscriptLine[];
  videoId: string;
  language?: string;
}
