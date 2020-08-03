const CONSTANTS = new ConstantVariables();

document.getElementById("authorise").addEventListener("click", function(e) {
    e.preventDefault();
    fetch(`https://${CONSTANTS.server_ip}/spotify_authorize`)
        .then(e => e.json())
        .then(data => {
            chrome.runtime.sendMessage({ get_access_token: true }, function (response) {
                if (response && parseInt(response.expiry) > Date.now()) {
                    chrome.tabs.create({ url: `https://${CONSTANTS.server_ip}/`});
                } else {
                    console.log(data.redirectUri);
                    chrome.tabs.create({ url: data.redirectUri });
                }
            });
        })
        .catch(error => { alert("Failed to prepare for Spotify Authentication") });
});

document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ get_access_token: true }, function (response) {
        if (response.access_token) {
            const outer_buttons = document.getElementsByClassName("outer_buttons");
            if (outer_buttons.length > 0) {
                outer_buttons[0].style.display = "block";
            } else {
                alert("An error has occured please try again...");
                return;
            }
            document.getElementById("authorise").style.display = "none";
        }
    });
});