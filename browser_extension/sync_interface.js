document.getElementById("authorise").addEventListener("click", function(e) {
    e.preventDefault();
    // fetch("http://localhost:3000/hello")
    // .then(response => {
    //     if (response.status === 200) {
    //         response.json().then(data => {
    //             console.log(data);
    //         });
    //     } else {
    //         console.log("problems");
    //     }
    // }).catch(error => {
    //     console.log(error);
    // });
    fetch('http://localhost:3000/spotify_authorize')
        .then(e => e.json())
        .then(data => {
            console.log(data.redirectUri);
            chrome.tabs.create({ url: data.redirectUri });
        })
        .catch(error => { alert("Failed to prepare for Spotify Authentication") });
})