// Browser API polyfill for Chrome/Firefox compatibility
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Background script to handle extension icon clicks
browserAPI.browserAction.onClicked.addListener(async (tab) => {
  // Send message to content script to toggle the element hider
  try {
    await browserAPI.tabs.sendMessage(tab.id, { action: 'toggle' });
  } catch (error) {
    console.error('Error toggling element hider:', error);
  }
});
