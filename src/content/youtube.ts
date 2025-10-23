/* eslint-disable @typescript-eslint/no-explicit-any */
// BASIC Content Script - Just extracts transcript when asked
console.log('YT Transcript: Content script loaded');

// Decode HTML entities helper
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// Listen for transcript fetch requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_TRANSCRIPT') {
    console.log('Fetching transcript...');

    // Inject script into page context to bypass CORS
    const script = document.createElement('script');
    script.textContent = `
      (async function() {
        try {
          const playerResponse = window.ytInitialPlayerResponse;
          const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
          
          if (!captionTracks || captionTracks.length === 0) {
            throw new Error('No captions available');
          }
          
          let track = captionTracks.find(t => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
          if (!track) track = captionTracks[0];
          
          const response = await fetch(track.baseUrl);
          const xmlText = await response.text();
          
          const resultElement = document.createElement('div');
          resultElement.id = 'yt-transcript-result';
          resultElement.style.display = 'none';
          resultElement.textContent = xmlText;
          document.body.appendChild(resultElement);
          
          window.dispatchEvent(new CustomEvent('yt-transcript-ready'));
        } catch (error) {
          window.dispatchEvent(new CustomEvent('yt-transcript-error', { 
            detail: { error: error.message }
          }));
        }
      })();
    `;

    const successHandler = () => {
      const element = document.getElementById('yt-transcript-result');
      const xmlText = element?.textContent || '';
      element?.remove();

      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const textNodes = xmlDoc.getElementsByTagName('text');

      const transcript: Array<{
        text: string;
        start: number;
        duration: number;
      }> = [];
      for (let i = 0; i < textNodes.length; i++) {
        const node = textNodes[i];
        transcript.push({
          text: decodeHtmlEntities(node.textContent || '').trim(),
          start: parseFloat(node.getAttribute('start') || '0'),
          duration: parseFloat(node.getAttribute('dur') || '0'),
        });
      }

      console.log('Transcript loaded:', transcript.length, 'lines');
      sendResponse({ success: true, transcript });
      cleanup();
    };

    const errorHandler = (event: any) => {
      console.error('Transcript error:', event.detail?.error);
      sendResponse({
        success: false,
        error: event.detail?.error || 'Failed to load transcript',
      });
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('yt-transcript-ready', successHandler);
      window.removeEventListener('yt-transcript-error', errorHandler);
    };

    window.addEventListener('yt-transcript-ready', successHandler);
    window.addEventListener('yt-transcript-error', errorHandler);

    document.documentElement.appendChild(script);
    script.remove();

    return true; // Keep message channel open
  }
});
