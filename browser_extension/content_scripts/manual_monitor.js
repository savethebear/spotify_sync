const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";

document.addEventListener('DOMContentLoaded', () => {
    // save access token
    chrome.runtime.sendMessage({ get_access_token: true }, function(response) {
        if (!response.access_token) {
            alert("Missing Authentication...");
        }
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, response.access_token);
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY, response.expiry);
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
        const song_list = new SongList();

        let now_playing;
        let progress_bar;
        let song_changed_observer;
        let interval = setInterval(function() {
            now_playing = $(".now-playing");
            progress_bar = $(".playback-bar div:first-child");

            if (now_playing.length > 0) {
                // init the song list
                song_changed(song_list, now_playing, progress_bar);

                song_changed_observer = new MutationObserver(function () {
                    song_changed(song_list, now_playing, progress_bar)
                });
                song_changed_observer.observe(now_playing[0], { attributes: true });

                console.log("Done..");
                clearInterval(interval);
            }
        }, 1000);

        // Seek
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

    function song_changed(song_list, now_playing, progress_bar) {
        console.log("Song changed..");

        const album_obj = now_playing.find("div > div > a");
        const current_link = parseAlbumLink(album_obj.attr('href'));
        const current_song = now_playing.find("a[data-testid='nowplaying-track-link']").first().text();

        if (song_list.song_list.length == 0) {
            // init song list object
            song_list.updateSongList(current_link, current_song);
            return;
        }
        
        // check if the album has changed
        if (current_link !== song_list.playlist_id) {
            // playlist changed...
        } else {
            // detect prev or next (assuming no shuffle)
            const offset = song_list.getOffset(current_song);
            if (offset > song_list.current_offset) {
                next_trigger();
            } else {
                prev_trigger();
            }
            song_list.current_offset = offset;
        }
    }

    function parseAlbumLink(link) {
        link = link.split("/");
        return link[link.length - 1];
    }
});

class SongList {
    constructor() {
        this.playlist_id = null;
        this.song_list = [];
        this.current_offset = null;
    }

    updateSongList(playlist_id, current_song) {
        this.playlist_id = playlist_id;
        this.getSongList(current_song);
    }

    getOffset(current_song) {
        for (let i  = 0; i < this.song_list.length; i++) {
            const song = this.song_list[i];
            if (song.title === current_song) {
                return i;
            }
        }
        console.log("Could not find " + current_song);
        return null;
    }

    getSongList(current_song) {
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
            const new_song_list = [];
            for (const song of data.tracks.items) {
                const cur_track = song.track;
                new_song_list.push(new Song(cur_track.name, cur_track.artists[0].name, 
                    cur_track.duration_ms, cur_track.available_markets));
            }
            this.song_list = new_song_list;

            // find offset of current song
            if (current_song) this.current_offset = this.getOffset(current_song);
            console.log(this.song_list);
        })
        .catch(error => {
            console.log(error);
        });
    }

    getCurrentEndTime() {

    }
}

class Song {
    constructor(title, artist, duration, markets) {
        this.title = title;
        this.artist = artist;
        this.duration = duration;
        this.markets = markets;
    }
}