const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";

function parseHash(hash) {
    return hash
        .substring(1)
        .split('&')
        .reduce(function (initial, item) {
            if (item) {
                var parts = item.split('=');
                initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
        }, {});
}

function sendToken(token) {
    chrome.runtime.sendMessage({ access_token: token }, function (response) {
        // console.log(response.farewell);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
    if (token &&
        parseInt(parseInt(localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY))) > Date.now()) {
        sendToken(token);
    } else {
        if (window.location.hash) {
            const hash = parseHash(window.location.hash);
            if (hash['access_token'] &&
                hash['expires_in']) {
                localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, hash['access_token']);
                localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY, Date.now() + 990 * parseInt(hash['expires_in']));
               sendToken(hash['access_token']);
               return;
            }
        }
        alert("Something went wrong...");
    }
});