/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TranscriptLine } from '../types/transcript';

/**
 * Fetches transcript from YouTube's timedtext API
 * This is a client-side approach that works directly in the browser
 */
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptLine[]> {
  try {
    // Step 1: Fetch the video page to get transcript metadata
    const videoPageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(videoPageUrl);
    const pageHtml = await pageResponse.text();

    // Step 2: Extract caption tracks from the page
    const captionTracks = extractCaptionTracks(pageHtml);

    if (captionTracks.length === 0) {
      throw new Error('No captions available for this video');
    }

    // Step 3: Get the first available caption track (prefer English)
    const englishTrack = captionTracks.find(
      (track) =>
        track.languageCode === 'en' || track.languageCode.startsWith('en')
    );
    const selectedTrack = englishTrack || captionTracks[0];

    // Step 4: Fetch the actual transcript data
    const transcriptResponse = await fetch(selectedTrack.baseUrl);
    const transcriptXml = await transcriptResponse.text();

    // Step 5: Parse the XML transcript
    const transcript = parseTranscriptXml(transcriptXml);

    return transcript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw error;
  }
}

/**
 * Extract caption track URLs from YouTube page HTML
 */
function extractCaptionTracks(
  html: string
): Array<{ baseUrl: string; languageCode: string }> {
  try {
    // YouTube embeds caption data in the page as JSON
    // Look for "captionTracks" in the player response
    const regex = /"captionTracks":(\[.*?\])/;
    const match = html.match(regex);

    if (!match) {
      return [];
    }

    const captionTracksJson = match[1];
    const captionTracks = JSON.parse(captionTracksJson);

    return captionTracks.map((track: any) => ({
      baseUrl: track.baseUrl,
      languageCode: track.languageCode,
    }));
  } catch (error) {
    console.error('Error extracting caption tracks:', error);
    return [];
  }
}

/**
 * Parse transcript XML into structured data
 */
function parseTranscriptXml(xml: string): TranscriptLine[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, 'text/xml');
  const textNodes = xmlDoc.getElementsByTagName('text');

  const transcript: TranscriptLine[] = [];

  for (let i = 0; i < textNodes.length; i++) {
    const node = textNodes[i];
    const start = parseFloat(node.getAttribute('start') || '0');
    const duration = parseFloat(node.getAttribute('dur') || '0');
    const text = decodeHtmlEntities(node.textContent || '');

    if (text.trim()) {
      transcript.push({
        text: text.trim(),
        start,
        duration,
      });
    }
  }

  return transcript;
}

/**
 * Decode HTML entities in transcript text
 */
function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}
