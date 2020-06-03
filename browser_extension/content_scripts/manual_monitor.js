document.addEventListener('DOMContentLoaded', () => {
    // Wait untils controls are visible
    const observer = new MutationObserver(function (mutation, me) {
        let controls = $(".player-controls");
        if (controls.length > 0) {
            try {
                setupObservers();
            } catch (error) {
                console.log(error);
            }
            me.disconnect();
            return;
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });

    function setupObservers() {
        // Play
        let play_button = $(".control-button[data-testid='control-button-pause']");
        if (play_button.length == 0) play_button = $(".control-button[data-testid='control-button-play']");

        // Next
        const next_button = $(".control-button[data-testid='control-button-skip-forward']");
        debugger
        // Prev
        const prev_button = $(".control-button[data-testid='control-button-skip-back']");

        // Seek


        // Add observers for each button
        const play_observer = new MutationObserver(play_trigger);
        play_observer.observe(play_button[0], { attributes: true });

        $(next_button).on("click", function() {
            next_trigger();
        });

        $(prev_button).on("click", function () {
            prev_trigger();
        });
    }
});