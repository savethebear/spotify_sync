chrome.runtime.onInstalled.addListener(function () {
    chrome.browserAction.setPopup({popup: "sync_interface.html"});
});