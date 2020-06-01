chrome.runtime.onInstalled.addListener(function () {
    chrome.browserAction.setPopup({popup: "sync_interface.html"});
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.access_token) {
            console.log(request.access_token);
            chrome.storage.sync.set({ spotify_session_token: request.access_token });
        }
    }
);