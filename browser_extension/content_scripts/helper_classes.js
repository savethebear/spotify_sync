
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
        })
            .then(e => e.json())
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
    }
}