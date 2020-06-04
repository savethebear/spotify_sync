const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";

document.addEventListener('DOMContentLoaded', () => {
    // save access token
    chrome.runtime.sendMessage({ get_access_token: true }, function(response) {
        if (!response.access_token) {
            alert("Missing Authentication...");
        }
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, response.access_token);
    });
    
    // Wait untils controls are visible
    const observer = new MutationObserver(function (mutation, me) {
        let controls = $(".player-controls");
        if (controls.length > 0) {
            try {
                setupObservers();
            } catch (error) {
                console.log(error);
            }
            me.disconnect();
            return;
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });

    function setupObservers() {
        // Play
        let play_button = $(".control-button[data-testid='control-button-pause']");
        if (play_button.length == 0) play_button = $(".control-button[data-testid='control-button-play']");

        const play_observer = new MutationObserver(play_trigger);
        play_observer.observe(play_button[0], { attributes: true });

        // Next button
        const next_button = $(".control-button[data-testid='control-button-skip-forward']");
        $(next_button).on("click", function () {
            next_trigger();
        });

        // Prev button
        const prev_button = $(".control-button[data-testid='control-button-skip-back']");
        $(prev_button).on("click", function () {
            prev_trigger();
        });

        // Media buttons events (from other devices)
        const now_playing = $(".now-playing");
        const progress_bar = $(".playback-bar div:first-child");

        const song_changed_observer = new MutationObserver(song_changed);
        

        // Seek
        let timeout = setTimeout(function() {
            let link = $(".now-playing").find("div > div > a").attr('href');
            // parse id
            link = link.split("/");
            let id = link[link.length - 1];
            
            let song_list = new SongList(id);
        }, 3000);
    }

    function play_trigger() {
        console.log("play has been triggered...");
    }

    function next_trigger() {
        console.log("next has been triggered...");
    }

    function prev_trigger() {
        console.log("prev has been triggered...");
    }

    function song_changed(progress_bar) {
        console.log("Song changed..");
    }
});

class SongList {
    constructor(playlist_id) {
        this.playlist_id = playlist_id;
        this.song_list = [];
        this.getSongList();
    }

    updateSongList(playlist_id) {
        this.playlist_id = playlist_id;
        this.getSongList();
    }

    getSongList() {
        let token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
        if (!token) {
            alert("Missing autherization...");
            return;
        }

        fetch(`https://api.spotify.com/v1/playlists/${this.playlist_id}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then(e => e.json())
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            console.log(error);
        });
    }
}