/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';

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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadTranscript = async () => {
    setLoading(true);
    setError('');
    setTranscript([]);

    try {
      // Find YouTube tab
      const tabs = await chrome.tabs.query({
        url: '*://www.youtube.com/watch?v=*',
      });

      if (tabs.length === 0) {
        throw new Error('No YouTube video tab found');
      }

      const tab = tabs[0];

      if (!tab.id) {
        throw new Error('Invalid tab');
      }

      // Request transcript from content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'FETCH_TRANSCRIPT',
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load transcript');
      }

      setTranscript(response.transcript);
    } catch (err: any) {
      setError(err.message);
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
