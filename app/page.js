'use client';
import Image from "next/image";
import getStripe from "@/utils/get-stripe";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { AppBar, Container, Toolbar, Typography, Button, Box, Grid, CircularProgress } from "@mui/material";
import Head from "next/head";
import { useRouter } from "next/navigation";
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { db } from '@/firebase'; // Import your Firestore configuration
import { doc, updateDoc, setDoc, getDoc, onSnapshot, setLogLevel } from 'firebase/firestore';
import Tooltip from '@mui/material/Tooltip';
import { useThemeContext } from '@/app/toggle_theme/theme-context.js'; // Adjust path if needed
import { Brightness4, Brightness7} from '@mui/icons-material'; // Icons for dark mode toggle
import IconButton from '@mui/material/IconButton';
setLogLevel('debug');
//FRONTEND YES SIR!
//hawk two: what?
// hawk three: good moring!
//hawk four: thats it!
//nd

export default function Home() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [basictype, setBasicType] = useState(false);
  const [protype, setProType] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(null);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const { mode, toggleTheme } = useThemeContext(); // Use the theme context for dark mode
  const [error, setError] = useState(null);

  


  const daysRemaining = subscriptionEndDate
    ? Math.ceil((subscriptionEndDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSubmit = async (plan) => {
    if (!user) {
      //console.error('User not authenticated');
      //return;
      alert('User not authenticated. Please sign in or sign up to continue.');
      return;
      //return router.push('/');
  }


    if (!isLoaded || !isSignedIn) {
      //console.error('User is not signed in.');
      alert('User is not signed in.');
      return;
    }
    
    
/////

    const userDocRef = doc(db, `cardstorage/${user.id}`);
    const userDocSnap = await getDoc(userDocRef);
  
    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
  
      if (userData.subscriptionStatus === 'active') {
        alert(
          `You already have an active subscription (${userData.subscriptionType.toUpperCase()}). ` +
          'You cannot purchase another subscription while your current subscription is active.'
        );
        return;
      }
    } else {
      alert("No subscription data found. Please contact support if this is an error.");
      return;
    }

////




    const userId = user.id; //Get the user's ID from Clerk

  
    if (userId) {
      console.log("Found userId: ", { userId });
    } else {
      console.error("userId is missing.");
    }

  //our frontend already correctly passes the userId in the request:
    const checkoutSession = await fetch('/api/checkout_session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        origin:  window.location.origin,
      },
      body: JSON.stringify({plan, userId}), //send the selected plan and pass the userId to the backend
    });

    const checkoutSessionJson = await checkoutSession.json();

    if (!checkoutSession.ok) {
      console.error('Failed to create checkout session:',checkoutSession.message || 'Unknown error occured');
      return;
    }

    const stripe = await getStripe();
    const { error } = await stripe.redirectToCheckout({
      sessionId: checkoutSessionJson.id,
    });

    if (error) {
      console.warn(error.message);
    } 

  };


  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, `cardstorage/${user.id}`);

    // Listen for real-time updates to Firestore document
    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const userData = docSnapshot.data();
            const now = new Date();
            
            let endDate;

            // Handle subscriptionEndDate properly
            if (userData.subscriptionEndDate instanceof Date) {
                endDate = userData.subscriptionEndDate;
            } else if (userData.subscriptionEndDate?.toDate) {
                endDate = userData.subscriptionEndDate.toDate();
            } else if (typeof userData.subscriptionEndDate === 'string') {
                endDate = new Date(userData.subscriptionEndDate);
            }

            if (endDate) {
                const isExpired = now > endDate;

                setSubscriptionEndDate(endDate);
                setSubscriptionExpired(isExpired);

                if (isExpired) {
                    // Update Firestore to reflect expired subscription
                    updateDoc(userDocRef, {
                        subscriptionStatus: 'inactive',
                        subscriptionType: 'none'
                    });

                    setSubscriptionActive(false);
                    setSubscriptionType('none');

                    alert('Your subscription has expired. Please renew to regain access.');

                } else {
                    setSubscriptionActive(userData.subscriptionStatus === 'active');
                    setSubscriptionType(userData.subscriptionType || 'none');
                }
            } else {
                setSubscriptionActive(userData.subscriptionStatus === 'active');
                setSubscriptionType(userData.subscriptionType || 'none');
            }
        } else {
            setSubscriptionActive(false);
            setSubscriptionType('none');
        }
        setLoading(false);
    });

    // Cleanup the listener when component unmounts
    return () => unsubscribe();
}, [user, isLoaded]);




  const handleButtonClickGeneratePage = async () => {

    if (!user) {
      alert("You must be logged in and contain active subscription to access this feature.");
      return;
    }

    const userDocRef = doc(db, `cardstorage/${user.id}`);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      
      if (userData.subscriptionStatus === 'active') {
        router.push('/generate');
      } else {
        alert("Your subscription is inactive. Please subscribe or renew to continue creating flashcards.");
        return;
      }
    } else {
      alert("User data not found.");
      return;
    }

  };

  const handleButtonClickCancel = async () => {

      if (!user) {
          alert("You must be logged & contain active subscription in order to cancel.");
          return;
      }
  
      try {
          // Re-fetch user data from Firestore
          const userDocRef = doc(db, `cardstorage/${user.id}`);
          const userDocSnap = await getDoc(userDocRef);
  
          // If user data doesn't exist, prevent cancellation
          if (!userDocSnap.exists()) {
              alert("User data not found.");
              return;
          }
  
          const userData = userDocSnap.data();
          console.log("Fetched User Data:", userData);  // Debugging line
  
          // Check if subscription is already inactive or missing
          if (!userData.subscriptionId || userData.subscriptionStatus !== 'active') {
              alert("No active subscription found or your subscription is already canceled.");
              return;
          }
  
          // Confirm with the user
          const confirmed = confirm("Are you sure you want to cancel your subscription?");
          if (!confirmed) return;
  


          // Proceed with cancellation via backend API
          const response = await fetch('/api/cancel_subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  userId: user.id,
                  subscriptionId: userData.subscriptionId,
              }),
          });

          const result = await response.json();
  
          if (response.ok) {
              // Update the local state to reflect the cancellation
              setSubscriptionActive(false);
              alert("Your subscription has been successfully canceled.");
              router.push('/');
          } else {
              alert("Failed to cancel. Please try again.");
          }
      } catch (err) {
          console.error('Error canceling subscription:', err);
          alert("An unexpected error occurred.");
      }
  };

  return (
    <Box maxWidth="100vw" sx={{
        bgcolor: 'background.default', // Dynamically applies the theme's background
        color: 'text.primary', // Dynamically applies the theme's text color
        minHeight: '100vh', // Ensure the full screen is covered
        display: 'flex',
        flexDirection: 'column',
      }}>
      <Head>
        <title>Flash-o-rama</title>
        <meta name="description" content="Create flashcards from your text" />
      </Head>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" style={{ flexGrow: 1 }}>Flash-o-rama</Typography>
          <IconButton color="inherit" onClick={toggleTheme}>
              {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </IconButton>
          <SignedOut>
            <Button color="inherit" href="/sign-in">
              {''}
              Login
            </Button>
            <Button color="inherit" href="/sign-up">
              {''}
              Sign Up
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </Toolbar>
      </AppBar>

      <Box sx={{ textAlign: 'center', my: 4 }}>
        <Typography variant="h2" gutterBottom border="10px solid" borderRadius={2} borderColor={'grey.300'}>Welcome to Flash-o-rama</Typography>
        <Typography variant="h5" gutterBottom>
          {''}
          The easiest way to make flashcards using AI!
        </Typography>
        <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleButtonClickGeneratePage}>
          Get Started
        </Button>
      </Box>
      
      <Box sx={{ my: 6 }}>
        <Typography variant="h4" gutterBottom textAlign="center">
          Features
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom textAlign="center" border="5px solid" borderRadius={2} borderColor={'grey.300'}>Easy Text Input</Typography>
            <Typography>
              {''}
              Simply input your text and let AI do the heavy lifting. Creating flashcards has never been easier.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom textAlign="center" border="5px solid" borderRadius={2} borderColor={'grey.300'}>Smart Flashcards</Typography>
            <Typography>
              {''}
              AI intelligently breaks down your text into concise flashcards, perfect for studying and reviewing.
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom textAlign="center" border="5px solid" borderRadius={2} borderColor={'grey.300'}>Accessible Anywhere</Typography>
            <Typography>
              {''}
              Access your flashcards from any device, at any time. Study on the go with ease.
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ my: 6, textAlign: 'center' }}>
    <Typography variant="h4" gutterBottom textAlign="center">Manage Subscriptions</Typography>
    <Typography variant="h5" gutterBottom>You can cancel your Subscription anytime and anywhere! :o</Typography>

    {!isSignedIn ? (
    // Show this message when the user is not signed in
    <Typography variant="h6" color="error" gutterBottom>
    You must sign in to view your subscription details.
    </Typography>
    ) : loading ? (
      // Show the loading spinner while loading subscription details
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
        </Box>
    ) : subscriptionActive ? (
      // Show subscription details if the user has an active subscription
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                Your subscription is <strong>{subscriptionType.toUpperCase()}</strong> and will expire on{' '}
                <strong>{subscriptionEndDate?.toLocaleDateString()}</strong> midnight.
            </Typography>
            {daysRemaining > 0 && (
                <Typography variant="body1" color="secondary">
                    Days remaining: <strong>{daysRemaining}</strong>
                </Typography>
            )}
        </Box>
    ) : (
      // Show this message if there is no active subscription
        <Typography variant="h6" color="error" gutterBottom>
            {subscriptionExpired 
                ? 'Your subscription has expired. Please renew by email or choose a plan to regain access.'
                : 'You currently have no active subscription. Subscribe today!'}
        </Typography>
    )}

    <Button 
        variant="contained" 
        color="primary" 
        sx={{ mt: 2 }} 
        onClick={handleButtonClickCancel}
    >
        Cancel Subscription
    </Button>
</Box>
      <Box sx={{ my: 6, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Available Plans</Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, border: '10px solid', borderColor: 'grey.300', borderRadius: 2 }}>
              <Typography variant="h5" gutterBottom>Basic</Typography>
              <Typography variant="h6" gutterBottom>$5 / month</Typography>
              <Typography>
                {''}
                Access to basic flashcard features and limited storage.
              </Typography>
                <Tooltip
                  title={
                    subscriptionActive
                      ? `You already have an active subscription (${subscriptionType.toUpperCase()}), 
                         and cannot purchase another subscription until it expires.`
                      : ''
                  }
                  arrow
                  disableHoverListener={!subscriptionActive} // Only show tooltip if the button is disabled
                >
              <span>
              <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={() => handleSubmit('basic')} disabled={subscriptionActive}>
                Choose Basic
              </Button>
                </span>
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 3, border: '10px solid', borderColor: 'grey.300', borderRadius: 2 }}>
              <Typography variant="h5" gutterBottom>Pro</Typography>
              <Typography variant="h6" gutterBottom>$10 / month</Typography>
              <Typography>
                {''}
                Unlimited flashcards and storage, with priority support.
              </Typography>
                  <Tooltip
                     title={
                      subscriptionActive
                        ? `You already have an active subscription (${subscriptionType.toUpperCase()}), 
                           and cannot purchase another subscription until it expires.`
                        : ''
                    }
                    arrow
                    disableHoverListener={!subscriptionActive} // Only show tooltip if the button is disabled
                  >
            <span>
              <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={() => handleSubmit('pro')} disabled={subscriptionActive}>
                Choose Pro
              </Button>
                </span>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
    
  );
}
