// Authorisation method copied from https://glitch.com/edit/#!/spotify-audio-analysis

var qs = require('querystring');
var express = require('express');
var app = express();

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

// listen for requests :)
var listener = app.listen(PORT, function () {
    console.log('Your app is listening on port ' + listener.address().port);
});