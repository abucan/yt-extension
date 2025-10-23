// BASIC Background Worker - Just opens the side panel
console.log('YT Transcript: Background worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});
