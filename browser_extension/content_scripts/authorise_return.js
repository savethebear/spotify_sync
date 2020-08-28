const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";
const LOCALSTORAGE_REFRESH_TOKEN_KEY = "spotify-sync-refresh-token";
const SPOTIFY_WEB_PLAYER_URL = "https://open.spotify.com/";

const CONSTANTS = new ConstantVariables();

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
    chrome.runtime.sendMessage({ access_token: token.token, expiry: token.expiry });
}

document.addEventListener('DOMContentLoaded', () => {
    let token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
    let expiry = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY);
    if (token &&
        parseInt(expiry) > Date.now()) {
        sendToken({
            token: token,
            expiry: expiry
        });
        window.location.assign(SPOTIFY_WEB_PLAYER_URL);
    } else {
        if (window.location.hash) {
            const hash = parseHash(window.location.hash);
            if (hash['access_token'] &&
                hash['expires_in']) {
                localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, hash['access_token']);
                const expiry_time = Date.now() + 990 * parseInt(hash['expires_in']);
                localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY, expiry_time);
                sendToken({
                   token: hash['access_token'],
                   expiry: expiry_time
               });
               window.location.assign(SPOTIFY_WEB_PLAYER_URL);
               return;
            }
        }else {
            const params = parseHash(window.location.search);
            if (params['code']) {
                let url = new URL(`https://${CONSTANTS.server_ip}/spotify_get_token`);
                url.searchParams.append("type", "initial_token");
                url.searchParams.append("code", params['code']);
                fetch(url)
                    .then(response => response.json())
                    .then(data => {
                        chrome.storage.clear();
                        chrome.storage.sync.set({
                            "spotify-sync-access-token": data.access_token,
                            "spotify-sync-access-token-expires-in": Date.now() + 990 * parseInt(data.expires_in),
                            "spotify-sync-refresh-token": data.refresh_token
                        }, function() {
                            window.location.assign(SPOTIFY_WEB_PLAYER_URL);
                        });
                    });
                return;
            }
            // chrome.runtime.sendMessage({get_access_token: true}, function(response) {
            //     token = response.access_token;
            //     expiry = response.expiry;
            //     if (expiry && parseInt(expiry) > Date.now()) {
            //         sendToken({
            //             token: token,
            //             expiry: expiry
            //         });
            //         window.location.assign(SPOTIFY_WEB_PLAYER_URL);
            //         return;
            //     }
            // });
        }
        alert("Something went wrong...");
    }
});