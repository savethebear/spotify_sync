document.getElementById("authorise").addEventListener("click", function(e) {
    e.preventDefault();
    fetch('http://localhost:3000/spotify_authorize')
        .then(e => e.json())
        .then(data => {
            chrome.runtime.sendMessage({ get_access_token: true }, function (response) {
                if (response && parseInt(response.expiry) > Date.now()) {
                    chrome.tabs.create({ url: "http://localhost:3000/"});
                } else {
                    console.log(data.redirectUri);
                    chrome.tabs.create({ url: data.redirectUri });
                }
            });
        })
        .catch(error => { alert("Failed to prepare for Spotify Authentication") });
})