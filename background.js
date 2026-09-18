chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["license"], (data) => {
    if (!data.license) {
      chrome.storage.local.set({ license: null });
    }
  });
});