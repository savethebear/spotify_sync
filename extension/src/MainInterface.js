import React from 'react';
import "./MainInterface.css";
import { Box, Paper, styled } from '@material-ui/core';
import AuthorisePage from './pages/Authorise';
// eslint-disable-next-line
import { spacing } from '@material-ui/system'; 
import Theme from './assets/themes/Theme';

const MainBackground = styled(Paper)({
    background: Theme.palette.primary.main,
    padding: 13,
    color: "white",
});

class MainInterface extends React.Component {
    render() {
        return (
            <div class="main_container">
                <MainBackground>
                    <span class="logo"><b>Spotify Sync</b></span>
                    <Box mt={2}>
                        <AuthorisePage />
                    </Box>
                </MainBackground>
            </div>
        )
    }
}

export default MainInterface;