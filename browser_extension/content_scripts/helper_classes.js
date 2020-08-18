
/**
 * Contains song list of current playlist
 */
class SongList {
    constructor() {
        this.playlist_id = null;
        this.song_list = [];
        this.current_offset = null;
    }

    /**
     * Method repopulates song list of new playlist
     * @param {int} playlist_id Spotify playlist id
     * @param {string} current_song Name of the current song
     */
    updateSongList(playlist_id, current_song) {
        this.playlist_id = playlist_id;
        this.getSongList(current_song);
    }

    /**
     * Gets the current position of the song.
     * @param {string} current_song Name of the current song
     * @returns The position of the song, and returns null if not found.
     */
    getOffset(current_song) {
        for (let i = 0; i < this.song_list.length; i++) {
            const song = this.song_list[i];
            if (song.title === current_song) {
                return i;
            }
        }
        console.log("Could not find " + current_song);
        return null;
    }

    /**
     * Populates a list of song objects.
     * @param {string} current_song name of the current song to set the current offset.
     */
    async getSongList(current_song) {
        let token = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
        if (!token) {
            alert("Missing autherization...");
            return;
        }

        let link = `https://api.spotify.com/v1${this.parsePlaylistId()}/tracks`;
        this.song_list = [];
        while (link) {
            let response = await fetch(link, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
            .catch(error => {
                console.log(error);
            });
            const data = await response.json();
            for (const song of data.items) {
                const cur_track = song.track;
                this.song_list.push(new Song(cur_track.name, cur_track.artists[0].name,
                    cur_track.duration_ms, cur_track.available_markets));
            }
            link = data.next;
        }
        if (current_song) {
            if (typeof current_song === "number") {
                this.current_offset = current_song;
            } else {
                this.current_offset = this.getOffset(current_song);
            }
        }
    }

    parsePlaylistId() {
        let modified = this.playlist_id;
        modified = modified.replace("album", "albums");
        modified = modified.replace("playlist", "playlists");
        return modified;
    }

    getCurrentSong() {
        return this.song_list[this.current_offset];
    }

    getCurrentEndTime() {
        return this.getCurrentSong().duration;
    }
}

/**
 * Class that represents attributes of a song.
 */
class Song {
    constructor(title, artist, duration, markets) {
        this.title = title;
        this.artist = artist;
        this.duration = duration;
        this.markets = markets;
    }
}

/**
 * Contains html elements that are important to monitor seeking.
 */
class SeekMonitorData {
    constructor() {
        this.progress_bar = null;
        this.observe_offset = null;
        this.past_time = null;
        this.seeking_interval = null;
    }
}

/**
 * Contains a boolean representing if the player actions are from user or
 * the server.
 */
class ObserverBlocker {
    constructor() {
        this.override = false;
        this.override_song_change = false;
        this.timeout;
    }
     
    executeEvent(event, delay) {
        if (typeof event !== "function") return;
        this.override = true;
        event();

        // delay unlocking the override
        const default_delay = 500;
        this.timeout = setTimeout(() => {
            this.override = false;
        }, delay ? delay : default_delay);
    }
}

/**
 * Contains information related to the current session of the room
 */
class SessionData {
    constructor(playlist_id, song_offset, milliseconds, play_state) {
        this.playlist_id = playlist_id;
        this.song_offset = song_offset;
        this.milliseconds = milliseconds;
        this.play_state = play_state;
    }
}