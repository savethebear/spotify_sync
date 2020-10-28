import React from 'react';
import "./MainInterface.css";
import ConstantVariables from './env_vars.js';
import { Box, Paper, styled } from '@material-ui/core';
import AuthorisePage from './pages/Authorise.js';
import Theme from './assets/themes/Theme.js';

const MainBackground = styled(Paper)({
    background: Theme.palette.primary.main,
    padding: 13,
    color: "white",
});

const CONSTANTS = new ConstantVariables();

class MainInterface extends React.Component {
    
    authTrigger() {
        fetch(`https://${CONSTANTS.server_ip}/spotify_authorize`)
            .then(e => e.json())
            .then(data => {
                window.chrome.storage.sync.get([CONSTANTS.access_token_expiry_key], function (response) {
                    if (response && parseInt(response[CONSTANTS.access_token_expiry_key]) > Date.now()) {
                        window.chrome.tabs.create({ url: `https://${CONSTANTS.server_ip}/` });
                    } else {
                        console.log(data.redirectUri);
                        window.chrome.tabs.create({ url: data.redirectUri });
                    }
                });
            })
            .catch(error => { alert("Failed to prepare for Spotify Authentication") });
    }

    render() {
        return (
            <div class="main_container">
                <MainBackground>
                    <span class="logo"><b>Spotify Sync</b></span>
                    <Box mt={2}>
                        <AuthorisePage auth={this.authTrigger} />
                    </Box>
                </MainBackground>
            </div>
        )
    }
}

export default MainInterface;