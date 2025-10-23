export type VideoDetectedMessage = {
  type: 'VIDEO_DETECTED';
  videoId: string;
};

export type VideoIdUpdateMessage = {
  type: 'VIDEO_ID_UPDATE';
  videoId: string | null;
};

export type FetchTranscriptMessage = {
  type: 'FETCH_TRANSCRIPT';
  videoId: string;
};

export type SeekVideoMessage = {
  type: 'SEEK_VIDEO';
  timestamp: number;
};

export type GetCurrentVideoMessage = {
  type: 'GET_CURRENT_VIDEO';
};

export type Message =
  | VideoDetectedMessage
  | VideoIdUpdateMessage
  | FetchTranscriptMessage
  | SeekVideoMessage
  | GetCurrentVideoMessage;
