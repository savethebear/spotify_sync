import { Box, Button } from '@material-ui/core';
// eslint-disable-next-line
import { spacing } from '@material-ui/system'; 

function AuthorisePage() {
    return (
        <Box mt={3}>
            <Button variant="contained" color="secondary" size="small">Start Sync!</Button>
        </Box>
    )
}

export default AuthorisePage;