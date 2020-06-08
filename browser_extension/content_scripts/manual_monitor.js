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
    
    let socket = io('http://localhost:3000');

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
        // Next button
        const next_button = $(".control-button[data-testid='control-button-skip-forward']");

        // Prev button
        const prev_button = $(".control-button[data-testid='control-button-skip-back']");

        // Media buttons events (from other devices)
        const song_list = new SongList();

        // Play
        let play_button = $(".control-button[data-testid='control-button-pause']");
        if (play_button.length == 0) play_button = $(".control-button[data-testid='control-button-play']");

        // variables for album changes
        let now_playing;
        let progress_bar;
        let song_changed_observer;

        // variables for seeking
        const seeking_data = new SeekMonitorData();

        let interval = setInterval(function() {
            now_playing = $(".now-playing");
            progress_bar = $(".playback-bar div:first-child").first();

            if (now_playing.length > 0) {
                // init the song list
                song_changed(song_list, now_playing, progress_bar);

                song_changed_observer = new MutationObserver(function () {
                    song_changed(song_list, now_playing)
                });
                song_changed_observer.observe(now_playing[0], { attributes: true });

                // play observer
                seeking_data.progress_bar = progress_bar;
                const play_observer = new MutationObserver(function() {
                    play_trigger(play_button, seeking_data, song_list.current_offset);
                });
                play_observer.observe(play_button[0], { attributes: true });

                console.log("Done..");
                clearInterval(interval);
            }
        }, 1000);
    }

    function play_trigger(play_button, seeking_data, current_offset) {
        console.log("play has been triggered...");

        let mode;

        // start interval if currently playing
        if (play_button.attr("data-testid") === "control-button-pause") {
            console.log("interval start");
            seeking_data.seeking_interval = setInterval(function() {
                seek_monitor(seeking_data, current_offset);
            }, 1000);
            mode = "play";
        } else {
            console.log("interval stop");
            clearInterval(seeking_data.seeking_interval);
            mode = "pause";
        }

        socket.emit('play_trigger', mode);
    }

    function next_trigger() {
        console.log("next has been triggered...");
        socket.emit('next_song');
    }

    function prev_trigger() {
        console.log("prev has been triggered...");
        socket.emit('prev_song');
    }

    function song_changed(song_list, now_playing) {
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

    function seek_monitor(seeking_data, current_offset) {        
        if (!seeking_data.progress_bar) return;
        if (!seeking_data.past_time) seeking_data.past_time = parseTimeToMS(seeking_data.progress_bar.text());
        if (!seeking_data.observe_offset || seeking_data.observe_offset !== current_offset) {
            seeking_data.observe_offset = current_offset;
            seeking_data.past_time = parseTimeToMS(seeking_data.progress_bar.text());
            return;
        }

        let observe_time = parseTimeToMS(seeking_data.progress_bar.text());
        const time_range = 2000;
        if (Math.abs(observe_time - seeking_data.past_time) > time_range) {
            // seek
            console.log("Seek Detected...");
        }

        seeking_data.past_time = observe_time;

        function parseTimeToMS(time) {
            const time_sections = time.split(":");
            let ms = 0;
            let multiply = 1000;
            for (let i = time_sections.length - 1; i >= 0; i--) {
                ms += parseInt(time_sections[i]) * multiply;
                multiply *= 60;
            }

            return ms;
        }
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

class SeekMonitorData {
    constructor() {
        this.progress_bar = null;
        this.observe_offset = null;
        this.past_time = null;
        this.seeking_interval = null;
    }
}