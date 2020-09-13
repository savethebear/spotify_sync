// Authorisation method copied from https://glitch.com/edit/#!/spotify-audio-analysis

var qs = require('querystring');
const fetch = require('node-fetch');
const url = require('url');
var express = require('express');
var cors = require('cors')
var fs = require('fs');
var app = express();

const key = process.env.CERT_KEY || fs.readFileSync('./keys/selfsigned.key');
const cert = process.env.CERT_CERT || fs.readFileSync('./keys/selfsigned.crt');

var http = require('https').createServer({
    key: key,
    cert: cert
}, app);
var io = require('socket.io')(http);

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const PORT = process.env.PORT || 3000;

var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});
const jssdkscopes = ["streaming", "user-read-email", "user-read-private", "user-read-playback-state", "user-modify-playback-state"];
const redirectUriParameters = {
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    scope: jssdkscopes.join(' '),
    redirect_uri: encodeURI(`https://${process.env.SERVER_IP}:${PORT}/`),
    show_dialog: true,
}
const redirectUri = `https://accounts.spotify.com/authorize?${qs.stringify(redirectUriParameters)}`;

app.use(express.static('public'));

app.get("/hello", function (request, response) {
    console.log("recieved");

    response.header('Access-Control-Allow-Origin', "*");
    response.header('Access-Control-Allow-Headers', "*");

    response.send(JSON.stringify({
        "message": "hi"
    }));

});

app.get("/spotify_authorize", function(request, response) {
    response.header('Access-Control-Allow-Origin', "*");
    response.header('Access-Control-Allow-Headers', "*");

    response.send(JSON.stringify({
        redirectUri
    }));
});

app.get("/spotify_get_token", cors(), async function(request, response) {
    const body = url.parse(request.url, true).query;
    const params = {
        redirect_uri: encodeURI(`https://${process.env.SERVER_IP}:${PORT}/`)
    };
    if (body.type === "initial_token") {
        params["grant_type"] = "authorization_code";
        params["code"] = body.code;
    } else if (body.type === "refresh_token") {
        params["grant_type"] = "refresh_token";
        params["refresh_token"] = body.refresh_token;
    }
    
    const api = `https://accounts.spotify.com/api/token?${qs.stringify(params)}`;
    try {
        const res = await fetch(api, {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_CLIENT_ID + ":" + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await res.json();
        response.send(data);
    } catch(error) {
        console.log(error);
        response.send({});
    }
});


// Generate room
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

const active_rooms = {
    "test_room": 1
};

// socket connections
io.on("connection", (socket) => {
    console.log("user connected...");

    socket.on('create_room', (data, callback) => {
        let room_id;
        do {
            room_id = randomString(5, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
        } while (active_rooms[room_id]);

        active_rooms[room_id] = 1;
        
        callback(room_id);
    });

    socket.on('join_room', (data, callback) => {
        const success = "success";
        const unknown_room = "unknown_room";
        const no_one_in_room = "no_one_in_room";
        
        if (data.room_id && active_rooms[data.room_id]) {
            const current_users_map = io.sockets.adapter.rooms[data.room_id];
            let current_users = [];
            if (current_users_map) {
                current_users = Object.keys(current_users_map.sockets);
            }

            socket.join(data.room_id, () => {
                // ask random person in room to give current status
                const random_user = current_users.length > 0 ? current_users[0] : null;

                // if (!random_user) {
                //     callback(no_one_in_room);
                //     return;
                // }
                console.log(current_users);
                if (current_users.length !== 0) {
                    io.to(random_user).emit('get_current_session', socket.id);
                }
                callback(success);
            });
            active_rooms[data.room_id]++;
        } else {
            callback(unknown_room);
        }
    });

    socket.on('send_session_data', (socket_id, session_data) => {
        socket.to(socket_id).emit('retrieve_session_data', session_data);
    });

    socket.on('play_trigger', (play_command, room_id) => {
        if (play_command === "play") {
            console.log("Play trigger play...");
        } else {
            console.log("Play trigger pause...");
        }
        socket.to(room_id).emit('external_play_trigger', play_command);
    });

    socket.on('next_song', (room_id, session_data) => {
        console.log("Next song trigger..." + JSON.stringify(session_data));
        socket.to(room_id).emit('external_next_song', session_data);
    });

    socket.on('prev_song', (room_id, session_data) => {
        console.log(`Prev song trigger... ${JSON.stringify(session_data)}`);
        socket.to(room_id).emit('external_previous_song', session_data);
    });

    socket.on('seek_trigger', (cur_timestamp, room_id) => {
        console.log("Seek trigger...");
        socket.to(room_id).emit('external_seek_trigger', cur_timestamp);
    });

    socket.on('change_playlist', (room_id, playlist_link, song_offset) => {
        console.log("Song changed...");
        socket.to(room_id).emit('external_change_playlist', playlist_link, song_offset);
    });

    socket.on('disconnecting', (reason) => {
        for (let key of Object.keys(socket.rooms)) {
            const room = active_rooms[key];
            if (room) {
                if (room < 2) {
                    delete active_rooms[key];
                } else {
                    active_rooms[key]--;
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});


// listen for requests :)
// var listener = app.listen(PORT, function () {
//     console.log('Your app is listening on port ' + listener.address().port);
// });
http.listen(PORT, () => {
    console.log('listening on *:' + PORT);
});
