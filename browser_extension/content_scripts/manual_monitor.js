// saved access token keys
const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";

// selector paths
const SELECTOR_PLAY_BUTTON = ".control-button[data-testid='control-button-play']";
const SELECTOR_PAUSE_BUTTON = ".control-button[data-testid='control-button-pause']";
const SELECTOR_NEXT_BUTTON = ".control-button[data-testid='control-button-skip-forward']";
const SELECTOR_PREV_BUTTON = ".control-button[data-testid='control-button-skip-back']";

// socket server
const SERVER_IP = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', () => {
    // save access token
    chrome.runtime.sendMessage({ get_access_token: true }, function(response) {
        if (!response.access_token) {
            alert("Missing Authentication...");
        }
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, response.access_token);
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY, response.expiry);
    });
    
    let socket = io(SERVER_IP);

    // Wait untils controls are visible
    const observer = new MutationObserver(function (mutation, me) {
        let controls = $(".player-controls");
        if (controls.length > 0) {
            try {
                setupObservers();
                setupListeners();
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

    const observer_blocker = new ObserverBlocker(); // variable representing source of player interaction
    const song_list = new SongList();  // Contains list of songs for current playlist

    function setupListeners() {
        // Play button
        socket.on("external_play_trigger", (play_command) => {
            observer_blocker.executeEvent(function() {
                const play_button = $(SELECTOR_PLAY_BUTTON).first();
                if ((play_command === "pause" && play_button.attr("data-testid") === "control-button-pause")
                    || (play_command === "play" && play_button.attr("data-testid") === "control-button-play")) {
                    play_button.click();
                }
            });
        });

        // Next button
        socket.on("external_next_song", (offset) => {
            observer_blocker.executeEvent(function() {
                observer_blocker.override_song_change = true;
                if (offset !== song_list.current_offset) {
                    $(SELECTOR_NEXT_BUTTON).first().click();
                }
            });
        });
    }

    function setupObservers() {
        // Play
        let play_button = $(".control-button[data-testid='control-button-pause']");
        if (play_button.length == 0) play_button = $(".control-button[data-testid='control-button-play']");

        // variables for album changes
        let now_playing;
        let progress_bar;
        let song_changed_observer;

        // variables for seeking
        const seeking_data = new SeekMonitorData();

        // Wait until player is visible
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
                    play_trigger(play_button);
                    seek_monitor_setup(play_button, seeking_data, song_list.current_offset)
                });
                play_observer.observe(play_button[0], { attributes: true });

                console.log("Done..");
                clearInterval(interval);
            }
        }, 1000);
    }

    function play_trigger(play_button) {
        if (!observer_blocker.override) {
            console.log("play has been triggered...");
    
            let mode = play_button.attr("data-testid") === "control-button-pause" ? "play" : "pause";
            socket.emit('play_trigger', mode);
        }
    }

    function seek_monitor_setup(play_button, seeking_data, current_offset) {
        clearInterval(seeking_data.seeking_interval);

        // start interval if currently playing
        if (play_button.attr("data-testid") === "control-button-pause") {
            seeking_data.seeking_interval = setInterval(function () {
                seek_monitor(seeking_data, current_offset);
            }, 1000);
        }
    }

    function next_trigger(offset) {
        // Event was triggered from socket
        if (observer_blocker.override) return;

        console.log("next has been triggered...");
        socket.emit('next_song', offset);
    }

    function prev_trigger(offset) {
        // Event was triggered from socket
        if (observer_blocker.override) return;

        console.log("prev has been triggered...");
        socket.emit('prev_song', offset);
    }

    function song_changed(song_list, now_playing) {
        // Event was triggered from socket
        if (observer_blocker.override || observer_blocker.override_song_change) {
            observer_blocker.override_song_change = false;
            return;
        }
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
                next_trigger(offset);
            } else {
                prev_trigger(offset);
            }
            song_list.current_offset = offset;
        }
    }

    function parseAlbumLink(link) {
        link = link.split("/");
        return link[link.length - 1];
    }

    function seek_monitor(seeking_data, current_offset) {   
        // Event was triggered from socket
        if (observer_blocker.override) return;   

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