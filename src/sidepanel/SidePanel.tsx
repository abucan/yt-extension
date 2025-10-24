/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';

interface TranscriptLine {
  text: string;
  start: number;
  duration: number;
}

function SidePanel() {
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatTimestamp = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadTranscript = async () => {
    setLoading(true);
    setError('');
    setTranscript([]);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.url) {
        throw new Error('Invalid tab');
      }

      const url = new URL(tab.url);
      const videoId = url.searchParams.get('v');

      if (!videoId) {
        throw new Error('Open a YouTube video first');
      }

      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_TRANSCRIPT',
        videoId,
      });

      if (!response?.success) {
        throw new Error(response?.error || 'Failed to load transcript');
      }

      setTranscript(response.transcript);
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='side-panel'>
      <header className='panel-header'>
        <h1>YouTube Transcript</h1>
      </header>

      <main className='panel-content'>
        <button
          onClick={handleLoadTranscript}
          disabled={loading}
          className='load-button'
        >
          {loading ? 'Loading...' : 'Load Transcript'}
        </button>

        {error && <div className='error'>⚠️ {error}</div>}

        {transcript.length > 0 && (
          <div className='transcript-list'>
            {transcript.map((line, index) => (
              <div key={index} className='transcript-line'>
                <span className='timestamp'>{formatTimestamp(line.start)}</span>
                <span className='text'>{line.text}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default SidePanel;
