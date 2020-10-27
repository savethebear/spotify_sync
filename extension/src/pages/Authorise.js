import { Box, Button } from '@material-ui/core';
// eslint-disable-next-line
import { spacing } from '@material-ui/system'; 

function AuthorisePage() {
    return (
        <Box width="fit-content" mx="auto" mt={3}>
            <Button variant="contained" color="secondary" size="small">Start Sync!</Button>
        </Box>
    )
}

export default AuthorisePage;