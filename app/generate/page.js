'use client';
import { writeBatch, doc, collection, getDoc, setDoc, serverTimestamp, deleteDoc, updateDoc, increment, getDocs, setLogLevel, getFirestore, Firestore } from "firebase/firestore";
import { useRouter } from "next/navigation"
import {useState, setSetName, useEffect, useRef} from 'react'
import {Button, Container, TextField, Typography, Box, Paper, CardActionArea, CardContent, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Grid, CircularProgress} from '@mui/material'
import {useUser} from '@clerk/nextjs'
import { db } from "@/firebase"
import { useThemeContext } from '@/app/toggle_theme/theme-context';
import { Brightness4, Brightness7 } from '@mui/icons-material';
setLogLevel("debug");
console.log(`$firestore instanceof Firestore: ${Firestore instanceof Firestore}`);
export default function Generate(){
    const {isLoaded, isSignedIn, user} = useUser()
    const [flashcards, setFlashcards] = useState([])
    const [flashcardCount, setFlashcardCount] = useState(12); // Default to 12 flashcards
    const [flipped, setFlipped] = useState([])
    const [text, setText] = useState('')
    //const [name, setName] = useState('')
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [setName, setSetName] = useState(''); // Renamed the state variable
    const { mode, toggleTheme } = useThemeContext();
    const [error, setError] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0); // Track the active card
    const [subscriptionType, setSubscriptionType] = useState(null); // Subscription type

    const router = useRouter()
    const cardRefs = useRef([]); // Store references to the flashcards
    //const db = getFirestore();

    useEffect(() => {
        // Scroll the active card into view whenever it changes
        if (subscriptionType === 'pro' && cardRefs.current[activeIndex]) {
            cardRefs.current[activeIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center', // Adjust scrolling position (center, start, or end)
            });
        }
    }, [activeIndex, subscriptionType]);



    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event) => {

            if (open) return; // Disable key navigation when the dialog is open

            if (!flashcards.length || subscriptionType !== 'pro') return;

            if (event.key === 'ArrowRight') {
                setActiveIndex((prev) => (prev + 1) % flashcards.length); // Navigate to the right
            } else if (event.key === 'ArrowLeft') {
                setActiveIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length); // Navigate to the left
            } else if (event.key === 'ArrowDown') {
                setActiveIndex((prev) => Math.min(prev + 3, flashcards.length - 1)); // Navigate down
            } else if (event.key === 'ArrowUp') {
                setActiveIndex((prev) => Math.max(prev - 3, 0)); // Navigate up
            } else if (event.key === ' ') {
                event.preventDefault();
                setFlipped((prev) => ({
                    ...prev,
                    [activeIndex]: !prev[activeIndex],
                })); // Toggle card visibility
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [flashcards, activeIndex, subscriptionType, open]); // Add `open` to the dependency array



    // Fetch the user's subscription type from Firestore
    useEffect(() => {
        async function fetchSubscriptionType() {
            if (user) {
                const userDocRef = doc(db, `cardstorage/${user.id}`);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const data = userDocSnap.data();
                    setSubscriptionType(data.subscriptionType); // e.g., 'pro' or 'basic'
                }
            }
        }

        fetchSubscriptionType();
    }, [user]);

    const handleSubmit=async () => {

        if (!text.trim()){
            alert('Please enter some text to generate flashcards.')
            return
        }

        if (flashcardCount < 1 || flashcardCount > 100) {
            alert('Please enter a number between 1 and 100 for the number of flashcards.');
            return;
        }



       setLoading(true);
       try {
           const res = await fetch(`/api/generate`, {
               headers: { 
                   'Content-Type': 'application/json',
               },
               method: 'POST',
               body: JSON.stringify({ text, count: flashcardCount }), // Pass the count to the backend
           });
           const data = await res.json();



           if (data?.flashcards && Array.isArray(data.flashcards)) {
            setFlashcards(data.flashcards); // Update state with flashcards
            console.log('Flashcards:', data.flashcards); // Log flashcards to debug
        } else {
            console.error('Invalid response format:', data);
        }
    } catch (error) {
        console.error('Error generating flashcards:', error);
    } finally {
        setLoading(false);
    }

    };

    const handleOpenDialog = () => setDialogOpen(true)
    const handleCloseDialog = () => setDialogOpen(false)

    const handlecardClick = (id)=>{
        setFlipped((prev)=> ({
            ...prev,
            [id]: !prev[id],
        }))
    }
    const handleOpen = () => {
        setOpen(true)
    }
    const handleClose = () => {
        setOpen(false)
    }
    const saveFlashcards = async () => {

        if (!user || !user.id) {
            alert('Please log in to save flashcards.');
            return;
          }
        ////test////
          console.log("User ID:", user.id);
          const cardSetsQuery = collection(FirebaseFirestore, `cardstorage/${user.id}/cards`);
          console.log("Firestore instance:", db);
          console.log("Collection path:", `cardstorage/${user.id}/cards`);
      
          const cardSetsSnapshot = await getDocs(cardSetsQuery);
          const currentSetCount = cardSetsSnapshot.size;
      
          console.log("Current flashcard set count:", currentSetCount);
        ////test////



          if (!setName || typeof setName !== 'string') {
            alert('Please enter a valid name for your flashcard set.');
            return;
          }
        
          const userDocRef = doc(db, `cardstorage/${user.id}`);
          const flashcardSetDocRef = doc(db, `cardstorage/${user.id}/cards/${setName}`);
        
          const userDocSnap = await getDoc(userDocRef);
        
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
        
        // Count the current number of sets directly from Firestore
        console.log('db:', db, 'user.id:', user?.id);
        if (!db || !user || !user.id) {
            console.error("Database or User ID is not initialized.");
            return;
        }
        console.log(`Fetching from path: cardstorage/${user.id}/cards`);
        const cardSetsQuery = collection(FirebaseFirestore, `cardstorage/${user.id}/cards`);
        const cardSetsSnapshot = await getDocs(cardSetsQuery);
        const currentSetCount = cardSetsSnapshot.size;  // Count existing sets




            // Enforce basic plan limit
            // Check subscription type and enforce limits for basic users
            if (userData.subscriptionType === 'basic' && currentSetCount >= 10) {
              alert('Basic plan users can only create 10 flashcard sets. Upgrade to Pro for unlimited sets.');
              return;
            }
        
            
        
            // Save the flashcard set
            await setDoc(flashcardSetDocRef, {
              name: setName,
              flashcards: flashcards,
              createdAt: serverTimestamp(),
            });

            // Update cardCount based on actual set count
            if (!userDocRef) {
                console.error("Invalid user document reference.");
                return;
            }
            await setDoc(userDocRef, { cardCount: currentSetCount + 1 }, { merge: true });
        
            alert('Flashcard set saved successfully!');
            setSetName('');
          } else {
            alert('User not found. Please check your login status.');
          }
        

        }

        if (!isLoaded || !isSignedIn) {
            return <></>;
        }


        if (loading) {
                return (
                    <Box
                    sx={{
                      bgcolor: 'background.default', // Dynamic background
                      color: 'text.primary', // Dynamic text color
                      minHeight: '100vh',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Container sx={{ mt: 8, textAlign: 'center' }}>
                        <CircularProgress />
                        <Typography variant="h6" sx={{ mt: 50 }}>
                            Let's generate flashcards... Please wait.
                        </Typography>
                    </Container>
                    </Box>
                );
            }
        
            if (error) {
                return (
                    <Box
                    sx={{
                      bgcolor: 'background.default', // Dynamic background
                      color: 'text.primary', // Dynamic text color
                      minHeight: '100vh',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="h6" color="error" align="center" sx={{ mt: 50 }}>
                        {error}
                    </Typography>
                    </Box>
                );
            }




        return (
            <Box
      sx={{
        bgcolor: 'background.default', // Dynamic background
        color: 'text.primary', // Dynamic text color
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
        <Container maxWidth="md">
            <Box 
            sx={{
                mt:4,
                 mb:6,
                  display: 'flex',
                   flexDirection: 'column',
                    alignItems: 'center',
            }}
            >
            <Typography variant="h1">Generate Flashcards</Typography>
            <Paper sx={{p:4, width: '100%'}}>
                <TextField value = {text}
                onChange={(e)=> setText(e.target.value)} label = "Enter text" fullWidth multiline rows={4} variant="outlined" sx={{mb:2,}}
                />

                <TextField
                        type="number"
                        value={flashcardCount}
                        onChange={(e) => setFlashcardCount(parseInt(e.target.value) || 0)}
                        label="Number of Flashcards (1-100)"
                        fullWidth
                        variant="outlined"
                        sx={{ mb: 2 }}
                        inputProps={{ min: 1, max: 100 }}
                />
                <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                fullWidth
                sx={{mb: 2}}
                >
                {''}
                Submit
            </Button>
            <Button
                variant="contained"
                color = "primary"
                onClick={()=> router.push('/')}
                fullWidth
                sx={{mb: 2}}
                > 
                ← Back to Home Page 
            </Button>

            <Button
                variant="contained"
                color = "primary"
                onClick={()=> router.push('/flashcards')}
                fullWidth
                sx={{mb: 2}}
                > 
                View FlashCard Sets →
            </Button>
            </Paper>
            </Box>

            {flashcards.length > 0 && (
            <Box sx={{mt: 4}}>
            <Typography variant="h5" textAlign="center"> Flashcards Preview</Typography>
            <Grid container spacing = {3}>
                {flashcards.map((flashcard, index) =>(
                    <Grid item xs= {12} sm = {6} md = {4} key = {index}>
                        <CardActionArea
                        ref={(el) => (cardRefs.current[index] = el)} // Assign ref to each card
                        onClick={() => {handlecardClick(index)}}
                        sx={{
                            border: subscriptionType === 'pro' && activeIndex === index ? '2px solid blue' : 'none', // Highlight active card for Pro users
                        }}
                        >
                            <CardContent>
                                <Box sx={{
                                    perspective: '200px',
                                    '& > div': {
                                        transition: 'transform 0.6s',
                                        outline: '5px solid',
                                        transformStyle: 'preserve-3d',
                                        fontWeight:'fontWeightBold',
                                        position: 'relative',
                                        width: '100%',
                                        height: '200px',
                                        boxShadow: '0 4px 30px 0 rgba(0,0,0,0.2)',
                                        transform: flipped[index]
                                        ? 'rotateX(180deg)'
                                        : 'rotateX(0deg)',
                                     },
                                     '& > div > div': {
                                        position: 'absolute',
                                        width: '100%',
                                        height: '100%',
                                        backfaceVisibility: "hidden",
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        padding: 2,
                                        boxSizing: 'border-box'
                                     },
                                     '& > div > div:nth-of-type(2)': {
                                        transform: 'rotateX(180deg)',
                                     },
                                }}
                                >
                                    <div>
                                        <div>
                                            <Typography variant="h7" component="div">
                                                {flashcard.front}
                                            </Typography>
                                        </div>
                                        <div>
                                            <Typography variant="h7" component="div">
                                                {flashcard.back}
                                            </Typography>
                                        </div>
                                    </div>
                                </Box>
                            </CardContent>
                        </CardActionArea>
                    </Grid>
                ))}
            </Grid>
            <Box sx={{sx:4, display: 'flex', justifyContent: 'center'}}>
                <Paper sx={{p:4, width: '100%'}}>
                <Button variant="contained" color="secondary" fullWidth onClick={handleOpen}>Save</Button>
                </Paper>
            </Box>
            </Box>
            )}

            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Save Flashcards</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please enter a name for your flashcards collection
                    </DialogContentText>
                    <TextField autoFocus 
                    margin="dense"
                    label="Collection Name"
                    type="text"
                    fullWidth
                    value={setName}
                    onChange={(e)=> setSetName(e.target.value)}
                    variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={saveFlashcards}>Save</Button>
                </DialogActions>
            </Dialog>
        </Container>
    </Box>
        )
    }