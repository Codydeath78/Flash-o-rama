"use client";
import { SignUp } from '@clerk/nextjs';
import {AppBar, Container, Typography, Button, Toolbar, Link, Box} from '@mui/material';

export default function SignUpPage()
{
    return( 
    <Container maxWidth="100vw">
        <AppBar position="static" sx={{backgroundColor: "#3f51b5"}}>
            <Toolbar>
                <Typography variant= "h6" sx={{flexGrow:1,}}>
                    Flash-o-rama
                </Typography>
                    <Button color = "inherit">
                        <Link href = "/sign-in" passhref="true" style={{ textDecoration: "none", color: "inherit" }}>
                        Login
                        </Link>
                    </Button>
                    <Button color = "inherit">
                        <Link href = "/sign-up" passhref="true" style={{ textDecoration: "none", color: "inherit" }}>
                        Sign In
                        </Link>
                    </Button>
            </Toolbar>
        </AppBar>
        <Box
            display = "flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>
            
        </Typography>
        <SignUp/>
        </Box>
    </Container>
    );
}