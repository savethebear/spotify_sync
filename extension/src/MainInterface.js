import React from 'react';
import "./MainInterface.css";
import { Container } from '@material-ui/core';
import AuthorisePage from './pages/Authorise';

class MainInterface extends React.Component {

    render() {
        return (
            <div class="main_container">
                <Container fixed>
                    <div class="logo">Spotify Sync</div>
                    <Container fixed>
                        <AuthorisePage />
                    </Container>
                </Container>
            </div>
        )
    }
}

export default MainInterface;