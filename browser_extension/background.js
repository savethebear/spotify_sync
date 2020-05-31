chrome.runtime.onInstalled.addListener(function () {
    chrome.browserAction.setPopup({popup: "sync_interface.html"});
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.access_token) {
            console.log(request.token);
        }
    });