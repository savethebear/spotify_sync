const SPOTIFY_SESSION_TOKEN_KEY = "spotify_session_token";
const SPOTIFY_SESSION_TOKEN_EXPIRES_IN = "spotify_session_expiry"

chrome.runtime.onInstalled.addListener(function () {
    chrome.browserAction.setPopup({popup: "sync_interface.html"});
});

let spotify_session_token;
let spotify_session_expiry;
chrome.storage.sync.get([SPOTIFY_SESSION_TOKEN_KEY], function (result) {
    spotify_session_token = result.spotify_session_token;
});
chrome.storage.sync.get([SPOTIFY_SESSION_TOKEN_EXPIRES_IN], function(result) {
    spotify_session_expiry = result.spotify_session_expiry;
});

let room_id; // room id expires as soon as the browser closes

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.access_token) {
            console.log(request.access_token);
            chrome.storage.sync.set({ SPOTIFY_SESSION_TOKEN_KEY: request.access_token });
            chrome.storage.sync.set({ SPOTIFY_SESSION_TOKEN_EXPIRES_IN: parseInt(request.expiry) });
            spotify_session_token = request.access_token;
            spotify_session_expiry = request.expiry;
        } else if (request.get_access_token) {
            sendResponse({ access_token: spotify_session_token, expiry: spotify_session_expiry, room_id: room_id });
        } else if (request.set_room_id) {
            room_id = request.room_id;
        } else if (request.get_room_id) {
            sendResponse({ room_id: room_id });
        }
    }
);