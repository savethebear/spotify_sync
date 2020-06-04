chrome.runtime.onInstalled.addListener(function () {
    chrome.browserAction.setPopup({popup: "sync_interface.html"});
});
let spotify_session_token;
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.access_token) {
            console.log(request.access_token);
            chrome.storage.sync.set({ spotify_session_token: request.access_token });
            spotify_session_token = request.access_token;
        } else if (request.get_access_token) {
            // chrome.storage.sync.get(['spotify_session_token'], function(result) {
            //     sendResponse({ access_token: result.spotify_session_token });
            // });
            sendResponse({ access_token: spotify_session_token });
        }
    }
);