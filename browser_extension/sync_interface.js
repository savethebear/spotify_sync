const CONSTANTS = new ConstantVariables();

$("#authorise").unbind("click").click(function(e) {
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

$("#join_room").click(function (e) {
    e.preventDefault();
    $("#room_id_input").show();
    show_room_buttons(false);
});

$("#cancel_room_id").click(function() {
    $("#room_id_input").hide();
});


document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ get_access_token: true }, function (response) {
        if (response.access_token) {
            const outer_buttons = document.getElementsByClassName("outer_buttons");
            show_room_buttons(true);
            document.getElementById("authorise").style.display = "none";
        }
    });

    $("#submit_room_id").unbind("click").click(function () {
        const user_input = document.getElementById("room_user_input").value;
        if (user_input) {
            // check if valid
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    console.log(tab.url);
                    if (tab.url.startsWith("https://open.spotify")) {
                        chrome.tabs.sendMessage(tab.id, { join_room: user_input }, function (response) {
                            if (response && response.code && response.code === "success") {
                                document.getElementById("active_room_container").style.display = "block";
                                document.getElementById("active_room").appendChild(document.createTextNode(document.getElementById("room_user_input").value));

                                // hide everything else
                                document.getElementById("room_id_input").style.display = "none";
                            }
                        });
                    }
                });
            });
        }
    });
});

function show_room_buttons(show) {
    const outer_buttons = document.getElementsByClassName("outer_buttons");
    if (outer_buttons.length > 0) {
        outer_buttons[0].style.display = show ? "block" : "none";
    }
}