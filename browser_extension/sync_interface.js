const CONSTANTS = new ConstantVariables();

$("#authorise").unbind("click").click(function(e) {
    e.preventDefault();
    toggleLoadAuth(true);
    fetch(`https://${CONSTANTS.server_ip}/spotify_authorize`)
        .then(e =>  e.json())
        .then(data => {
            toggleLoadAuth(false);
            chrome.storage.sync.get([CONSTANTS.access_token_expiry_key], function (response) {
                if (response && parseInt(response[CONSTANTS.access_token_expiry_key]) > Date.now()) {
                    chrome.tabs.create({ url: `https://${CONSTANTS.server_ip}/`});
                } else {
                    console.log(data.redirectUri);
                    chrome.tabs.create({ url: data.redirectUri });
                }
            });
        })
        .catch(error => { alert("Failed to prepare for Spotify Authentication") });
});

function toggleLoadAuth(show_loading) {
    if (show_loading) {
        $("#auth_container .loader").show();
        $("#authorise").hide();
    } else {
        $("#auth_container .loader").hide();
        $("#authorise").show();
    }
}

$("#join_room").click(function (e) {
    e.preventDefault();
    $("#room_id_input").show();
    show_room_buttons(false);
});

$("#cancel_room_id").click(function() {
    $("#room_id_input").hide();
});


document.addEventListener('DOMContentLoaded', () => {
    // chrome.storage.sync.clear();
    // init view
    chrome.storage.sync.get([CONSTANTS.access_token_key, CONSTANTS.room_id_key, CONSTANTS.access_token_expiry_key], function (response) {
        if (response[CONSTANTS.access_token_key] && parseInt(response[CONSTANTS.access_token_expiry_key]) > Date.now()) {
            $("#auth_container").hide();

            if (!response[CONSTANTS.room_id_key]) {
                show_room_buttons(true);
            } else {
                $("#active_room_container").show();
                $("#active_room").text(response[CONSTANTS.room_id_key]);

                show_room_buttons(false);
            }
        }
    });

    $("#submit_room_id").unbind("click").click(function (e) {
        e.preventDefault();
        const user_input = document.getElementById("room_user_input").value;
        if (user_input) {
            // check if valid
            chrome.tabs.query({}, function(tabs) {
                tabs.forEach(tab => {
                    if (tab.url.startsWith("https://open.spotify")) {
                        chrome.tabs.sendMessage(tab.id, { join_room: user_input }, function (response) {
                            if (response && response.code && response.code === "success") {
                                document.getElementById("active_room_container").style.display = "block";
                                document.getElementById("active_room").appendChild(document.createTextNode(document.getElementById("room_user_input").value));

                                // hide everything else
                                document.getElementById("room_id_input").style.display = "none";

                                // save id in background
                                chrome.storage.sync.set({ [CONSTANTS.room_id_key]: user_input });
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