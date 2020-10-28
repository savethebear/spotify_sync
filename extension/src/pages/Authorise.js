import { Box, Button } from '@material-ui/core';

function AuthorisePage(props) {
    return (
        <Box width="fit-content" mx="auto" mt={3}>
            <Button variant="contained" color="secondary" size="small" onClick={props.auth}>Start Sync!</Button>
        </Box>
    )
}

export default AuthorisePage;