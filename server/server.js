// Authorisation method copied from https://glitch.com/edit/#!/spotify-audio-analysis

var qs = require('querystring');
var express = require('express');
var app = express();
var http = require('http').createServer(app);
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
const jssdkscopes = ["streaming", "user-read-email", "user-read-private"];
const redirectUriParameters = {
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'token',
    scope: jssdkscopes.join(' '),
    redirect_uri: encodeURI(`http://localhost:${PORT}/`),
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
                if (current_users.length === 0) {
                    io.to(socket.id).emit('retrieve_session_data', 
                        {
                            playlist_id: "/playlist/2LbdIXB6JzgsEgNk90Bxe3", 
                            song_offset: 2, 
                            milliseconds: 3
                        });
                } else {
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
        io.to(socket_id).emit('retrieve_session_data', session_data);
    });

    socket.on('play_trigger', (play_command, room_id) => {
        if (play_command === "play") {
            console.log("Play trigger play...");
        } else {
            console.log("Play trigger pause...");
        }
        socket.to(room_id).emit('external_play_trigger', play_command);
    });

    socket.on('next_song', (offset) => {
        console.log("Next song trigger...");
        socket.broadcast.emit('external_next_song', offset);
    });

    socket.on('prev_song', (offset) => {
        console.log("Prev song trigger...");
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