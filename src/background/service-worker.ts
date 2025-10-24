/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */

const CLIENT_ID =
  '987918240413-sus6p2rqulrimhg133ngc5lqtotodmv8.apps.googleusercontent.com';
let accessToken: string | null = null;

async function getAccessToken(): Promise<string> {
  if (accessToken) {
    return accessToken;
  }

  return new Promise((resolve, reject) => {
    const redirectURL = `https://${chrome.runtime.id}.chromiumapp.org/`;
    const authURL = new URL('https://accounts.google.com/o/oauth2/auth');
    authURL.searchParams.set('client_id', CLIENT_ID);
    authURL.searchParams.set('response_type', 'token');
    authURL.searchParams.set('redirect_uri', redirectURL);
    authURL.searchParams.set(
      'scope',
      'https://www.googleapis.com/auth/youtube.readonly'
    );

    chrome.identity.launchWebAuthFlow(
      {
        url: authURL.toString(),
        interactive: true,
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!responseUrl) {
          reject(new Error('No response URL'));
          return;
        }

        try {
          const url = new URL(responseUrl);
          const token = url.hash
            .substring(1)
            .split('&')
            .find((p) => p.startsWith('access_token='));

          if (!token) {
            reject(new Error('No access token in response'));
            return;
          }

          accessToken = token.substring('access_token='.length);
          resolve(accessToken);
        } catch (error: any) {
          reject(error);
        }
      }
    );
  });
}

async function fetchTranscript(videoId: string): Promise<any> {
  try {
    const token = await getAccessToken();

    const captionsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!captionsResponse.ok) {
      const error = await captionsResponse.json();
      throw new Error(error.error?.message || 'Failed to fetch captions list');
    }

    const captionsData = await captionsResponse.json();
    const items = captionsData.items;

    if (!items || items.length === 0) {
      throw new Error('No captions available for this video');
    }

    let track = items.find((i: any) => i.snippet?.language?.startsWith('en'));
    if (!track) track = items[0];

    const captionId = track.id;

    const downloadResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${captionId}?tfmt=vtt`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!downloadResponse.ok) {
      const error = await downloadResponse.json();
      throw new Error(error.error?.message || 'Failed to download captions');
    }

    const vttText = await downloadResponse.text();
    const transcript = parseVTT(vttText);

    return transcript;
  } catch (error: any) {
    throw error;
  }
}

function parseVTT(
  vttText: string
): Array<{ text: string; start: number; duration: number }> {
  const lines = vttText.split('\n');
  const transcript: Array<{ text: string; start: number; duration: number }> =
    [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.includes('-->')) {
      const parts = line.split('-->');
      if (parts.length === 2) {
        const start = timeToSeconds(parts[0].trim());

        i++;
        let text = '';
        while (
          i < lines.length &&
          lines[i].trim() &&
          !lines[i].includes('-->')
        ) {
          text += (text ? ' ' : '') + lines[i].trim();
          i++;
        }

        if (text) {
          transcript.push({
            text,
            start,
            duration: 0,
          });
        }
        continue;
      }
    }
    i++;
  }

  return transcript;
}

function timeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0]) || 0;
  const minutes = parseInt(parts[1]) || 0;
  const seconds = parseFloat(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_TRANSCRIPT') {
    const videoId = message.videoId;

    fetchTranscript(videoId)
      .then((transcript) => {
        sendResponse({ success: true, transcript });
      })
      .catch((error: any) => {
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
