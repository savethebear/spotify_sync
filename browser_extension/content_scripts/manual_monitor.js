// saved access token keys
const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-sync-access-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = "spotify-sync-access-token-expires-in";

// selector paths
const SELECTOR_PLAY_BUTTON = ".control-button[data-testid='control-button-play']";
const SELECTOR_PAUSE_BUTTON = ".control-button[data-testid='control-button-pause']";
const SELECTOR_NEXT_BUTTON = ".control-button[data-testid='control-button-skip-forward']";
const SELECTOR_PREV_BUTTON = ".control-button[data-testid='control-button-skip-back']";

const CONSTANTS = new ConstantVariables();

// socket server
const SERVER_IP = `https://${CONSTANTS.server_ip}`;

document.addEventListener('DOMContentLoaded', () => {
    // save access token
    chrome.runtime.sendMessage({ get_access_token: true }, function(response) {
        if (!response.access_token) {
            alert("Missing Authentication...");
        }
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, response.access_token);
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY, response.expiry);
    });
    
    let socket = io.connect(SERVER_IP, { secure: true });

    // ========== FOR DEBUGGING PURPOSE ==========
    const room_id = 'test_room'
    socket.emit('join_room', { room_id: room_id }, function (code) {
        if (code === "success") {
            console.log(`Successfully joined ${room_id}`);
        } else {
            console.log(`Failed to join ${room_id}`);
        }
    });

    // ========== FOR DEBUGGING PURPOSE ==========

    const observer_blocker = new ObserverBlocker(); // variable representing source of player interaction
    const song_list = new SongList();  // Contains list of songs for current playlist
    const seeking_data = new SeekMonitorData();  // object for seeking
    let init_session_data = null;

    // Wait untils controls are visible
    const observer = new MutationObserver(function (mutation, me) {
        let controls = $(".player-controls");
        if (controls.length > 0) {
            try {
                setupObservers(init_session_data);

                setTimeout(function() {
                    init_user_playback(init_session_data);
                }, 1000);
            } catch (error) {
                console.log(error);
            }
            me.disconnect();
            return;
        }
    });
    
    setupListeners();
    function setupListeners() {
        // ========== Session data handlers ==========
        socket.on("get_current_session", (socket_id) => {
            socket.emit('send_session_data', socket_id, 
                new SessionData(song_list.playlist_id, song_list.current_offset, parseTimeToMS(seeking_data.progress_bar.text())));
        });
        
        socket.on("retrieve_session_data", (session_data) => {
            if (session_data.playlist_id && session_data.song_offset) {
                console.log(session_data);
                // Init session
                init_session_data = session_data;
                observer.observe(document, {
                    childList: true,
                    subtree: true
                });
            }
        });

        // ========== Player Handlers ==========

        // Play button
        socket.on("external_play_trigger", (play_command) => {
            observer_blocker.executeEvent(function() {
                const play_button = $(SELECTOR_PLAY_BUTTON).length > 0 ? $(SELECTOR_PLAY_BUTTON).first() : $(SELECTOR_PAUSE_BUTTON).first();
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

        // Previous button
        socket.on("external_previous_song", (offset) => {
            observer_blocker.executeEvent(function () {
                observer_blocker.override_song_change = true;
                if (offset !== song_list.current_offset) {
                    $(SELECTOR_PREV_BUTTON).first().click();
                }
            });
        });

        // Seek handle
        socket.on("external_seek_trigger", (cur_timestamp) => {
            seek(cur_timestamp);
        });
    }

    function setupObservers(session_data) {
        // Play
        let play_button = $(".control-button[data-testid='control-button-pause']");
        if (play_button.length == 0) play_button = $(".control-button[data-testid='control-button-play']");

        // variables for album changes
        let now_playing;
        let progress_bar;
        let song_changed_observer;

        // Wait until player is visible
        let interval = setInterval(function() {
            now_playing = $(".now-playing");
            progress_bar = $(".playback-bar div:first-child").first();

            if (now_playing.length > 0) {
                // init the song list
                if (session_data) {
                    song_list.updateSongList(session_data.playlist_id, session_data.song_offset);
                } else {
                    song_changed(song_list, now_playing, progress_bar);
                }

                song_changed_observer = new MutationObserver(function () {
                    song_changed(song_list, now_playing)
                });
                song_changed_observer.observe(now_playing[0], { attributes: true });

                // play observer
                seeking_data.progress_bar = progress_bar;
                const play_observer = new MutationObserver(function() {
                    if (!play_button.attr("class").includes("control-button--loading")) {
                        play_trigger(play_button, room_id);
                    }
                    seek_monitor_setup(play_button, seeking_data, song_list.current_offset)
                });
                play_observer.observe(play_button[0], { attributes: true });

                console.log("Done..");
                clearInterval(interval);
            }
        }, 1000);
    }

    function play_trigger(play_button, room_id) {
        if (!observer_blocker.override) {
            console.log("play has been triggered...");
    
            let mode = play_button.attr("data-testid") === "control-button-pause" ? "play" : "pause";
            socket.emit('play_trigger', mode, room_id);
        }
    }

    function seek_monitor_setup(play_button, seeking_data, current_offset) {
        clearInterval(seeking_data.seeking_interval);

        // start interval if currently playing
        if (play_button.attr("data-testid") === "control-button-pause") {
            seeking_data.seeking_interval = setInterval(function () {
                seek_monitor(seeking_data, current_offset);
            }, 500);
        }
    }

    function next_trigger(offset) {
        // Event was triggered from socket
        if (observer_blocker.override) return;

        console.log("next has been triggered...");
        socket.emit('next_song', offset, room_id);
    }

    function prev_trigger(offset) {
        // Event was triggered from socket
        if (observer_blocker.override) return;

        console.log("prev has been triggered...");
        socket.emit('prev_song', offset, room_id);
    }

    function song_changed(song_list, now_playing) {
        // Event was triggered from socket
        if (observer_blocker.override || observer_blocker.override_song_change) {
            observer_blocker.override_song_change = false;
            return;
        }
        console.log("Song changed..");

        const album_obj = now_playing.find("div > div > a");
        const current_link = album_obj.attr('href');
        const current_song = now_playing.find("a[data-testid='nowplaying-track-link']").first().text();

        if (song_list.song_list.length == 0) {
            // init song list object
            song_list.updateSongList(current_link, current_song);
            return;
        }
        
        // check if the album has changed
        if (current_link !== song_list.playlist_id) {
            // playlist changed...
            song_list.updateSongList(current_link, current_song);
            console.log("playlist changed");
            // todo: emit something
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
            if (!observer_blocker.override) {
                socket.emit("seek_trigger", observe_time, room_id);
            }
        }

        seeking_data.past_time = observe_time;
    }

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

    async function init_user_playback(init_session_data) {
        let token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);

        let response = await fetch(`https://api.spotify.com/v1/me/player/devices`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).catch(error => {
            console.log(error);
        });    
        let data = await response.json();
        let active_device = null;
        let web_player = null;
        data.devices.forEach(elem => {
            if (elem.is_active) {
                active_device = elem;
            }
            if (elem.name.includes("Web Player")) {
                web_player = elem;
            }
        });

        play(active_device != null ? active_device.id : web_player.id, init_session_data);
    }

    function seek(duration) {
        let token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
        observer_blocker.override = true;
        fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${duration}`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => observer_blocker.override = false);
    }

    function play(device_id, session_data) {
        let token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
        
        if (!session_data.playlist_id) {
            console.log("session_data invalid...");
            return;
        }
        
        const data = { context_uri: `spotify:${contextURIParse(session_data.playlist_id)}` };
        if (session_data.song_offset) data["offset"] = { position: parseInt(session_data.song_offset) };
        if (session_data.milliseconds) data["position_ms"] = parseInt(session_data.milliseconds);

        let url = `https://api.spotify.com/v1/me/player/play`;
        if (device_id) url + `?device_id=${device_id}`;

        fetch(url, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(data)
        }).catch((error) => {
            console.error("Failed to retrieve session data...: ", error);
        });

        function contextURIParse(playlist_id) {
            let temp = playlist_id.split('/');
            temp.shift();
            return temp.join(':');
        }
    }
});