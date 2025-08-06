'use client';
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc, updateDoc, increment, getDoc, setLogLevel, getFirestore, Firestore } from "firebase/firestore";
import { db } from '@/utils/firebase';
import { useRouter } from "next/navigation";
import { Container, Grid, Card, CardActionArea, CardContent, Typography, TextField, CircularProgress, Button, Box } from '@mui/material';
import { useThemeContext } from '@/app/toggle_theme/theme-context';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
setLogLevel("debug");
console.log(`$firestore instanceof Firestore: ${Firestore instanceof Firestore}`);
export default function FlashcardsPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const [flashcardSets, setFlashcardSets] = useState([]); //All sets
    const [searchInput, setSearchInput] = useState(""); // Search input state
    const [filteredSets, setFilteredSets] = useState([]); // Filtered sets based on search
    const [selectedSet, setSelectedSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subscriptionType, setSubscriptionType] = useState('');
    const [cardCount, setCardCount] = useState(0);
    const { mode, toggleTheme } = useThemeContext();
    const router = useRouter();
    //const db = getFirestore();

//enlsfggggg
//jhawlfnesfesejkfnewnfe
//ejnfjkoe
//i can't stand this anymore!
//esjnfesfns
//bbbbb
//hawk two!!!!!!!!!!!!!!!!!!!!!!!!
//hawk 33!!!!!!!!!!!!!!!!!!
//hawk four!!!!!!!!!!!!!!!!!!!
///////////////////////////////////////////////////////////////////////////////
//I will work on this project later. soon.
// Fetch initial flashcard sets
useEffect(() => {
    const fetchFlashcardSets = async () => {
        const mockSets = [
            { id: "1", name: "car quiz", createdAt: new Date() },
            { id: "2", name: "fire quiz", createdAt: new Date() },
            { id: "3", name: "water quiz", createdAt: new Date() },
        ];
        setFlashcardSets(mockSets);
        setFilteredSets(mockSets); // Initialize filtered sets
    };

    fetchFlashcardSets();
}, []);

// Filter sets based on the search input
useEffect(() => {
    if (!searchInput) {
        setFilteredSets(flashcardSets); // Show all sets when search is empty
    } else {
        const lowerCaseInput = searchInput.toLowerCase();
        setFilteredSets(
            flashcardSets.filter((set) =>
                set.name.toLowerCase().includes(lowerCaseInput)
            )
        );
    }
}, [searchInput, flashcardSets]);


/////////////////////////////////////////////////////////////////////////
    useEffect(() => {
        async function fetchFlashcardSets() {
            if (!user || !user.id) {
                alert('Please log in to save & view flashcards.');
                return router.push('/generate')
            }

            try {
                setLoading(true);

                // Fetch user subscription data
                const userDocRef = doc(db, `cardstorage/${user.id}`);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setSubscriptionType(userData.subscriptionType || 'basic');
                    setCardCount(userData.cardCount || 0);
                }


                // Fetch all flashcard sets for the logged-in user
                console.log('db:', db, 'user.id:', user?.id);
                if (!db || !user || !user.id) {
                    console.error("Database or User ID is not initialized.");
                    return;
                }
                console.log(`Fetching from path: cardstorage/${user.id}/cards`);
                const colRef = collection(db,`cardstorage/${user.id}/cards`);
                 // Debug: Check Firestore instance and collection path
                console.log("Firestore instance:", db);
                console.log("Collection path:", `cardstorage/${user.id}/cards`);
                const querySnapshot = await getDocs(colRef);

                const sets = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    // Parse createdAt to a valid date format
                    const createdAt = data.createdAt ? new Date(data.createdAt.seconds * 1000) : null;
                    sets.push({ id: doc.id, ...doc.data(), createdAt });
                });

                console.log("Fetched flashcard sets:", sets);
                setFlashcardSets(sets);
            } catch (err) {
                console.error("Error fetching flashcard sets:", err);
                setError("Failed to load flashcard sets. Please try again.");
            } finally {
                setLoading(false);
            }
        }

        fetchFlashcardSets();
    }, [user]);

    // Handle selecting a flashcard set
    const handleSelectSet = (setId) => {
        setSelectedSet((prev) => (prev === setId ? null : setId)); //Toggle selection
    }

    const handleDeleteSet = async () => {
        if (!setSelectedSet) return;

        try {
            // Delete the selected flashcard set
            if (!selectedSet) {
                console.error("No set selected for deletion.");
                return;
            }
            if (!db || !user || !user.id) {
                console.error("Database or User ID is not initialized.");
                return;
            }
            await deleteDoc(doc(db, `cardstorage/${user.id}/cards`, selectedSet));

            // Query Firestore for the remaining flashcard sets
            if (!db || !user || !user.id) {
                console.error("Database or User ID is not initialized.");
                return;
            }
        const cardSetsQuery = collection(db,`cardstorage/${user.id}/cards`);
        const cardSetsSnapshot = await getDocs(cardSetsQuery);
        const newSetCount = cardSetsSnapshot.size;


        // Update the cardCount in Firestore after deletion
        const userDocRef = doc(db, `cardstorage/${user.id}`);
        await updateDoc(userDocRef, { cardCount: newSetCount });


            //Remove the deleted set from the local state
            // Update local state to reflect the changes
            setFlashcardSets((prev) => prev.filter((set) => set.id !== selectedSet));
            setSelectedSet(null);
            setCardCount(newSetCount);  // Update local card count state
            alert("Flashcard set deleted successfully.");
        } catch (err) {
            console.error("Error deleting flashcard set:", err);
            alert("Failed to delete flashcard set. Please try again.");
        }
    }
        // Upgrade to Pro
    const handleUpgrade = async () => {
        try {
            const checkoutSession = await fetch('/api/checkout_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ plan: 'pro', userId: user.id }),
            });

            const session = await checkoutSession.json();
            if (session.error) {
                throw new Error(session.error);
            }

            const stripe = await (await import('@/utils/get-stripe')).default();  // Corrected Stripe initialization
            const stripeInstance = await stripe;  // Wait for the stripe instance to load

            const { error } = await stripeInstance.redirectToCheckout({  // Call redirectToCheckout on stripe instance
            sessionId: session.id,
            });


            if (error) {
                console.error("Stripe error:", error.message);
            }
        } catch (err) {
            console.error("Error upgrading to Pro:", err.message);
            alert("Failed to upgrade. Please try again.");
        }
    };

    const handleSearchChange = (event) => {
        setSearchInput(event.target.value);
    };



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
                    Loading your flashcard sets... Please wait.
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
        <Container maxWidth="md" sx={{ mt: 4 }}>
                <Button
                variant="contained"
                color = "primary"
                onClick={()=> router.push('/generate')}
                sx={{mb: 2}}
                > 
                ← Back to Creation
            </Button>
            <Typography variant="h4" align="center" gutterBottom>
                Your Flashcard Sets
            </Typography>
            <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search flashcard sets..."
                    value={searchInput}
                    onChange={handleSearchChange}
                    sx={{ mb: 4 }}
                />
            {/* Subscription Limit Display */}
            {subscriptionType === 'basic' ? (
                <>
                <Typography variant="body1" sx={{ color: cardCount >= 10 ? 'red' : 'orange' }}>
                    Your subscription is <strong>Basic</strong>. You can only create and view up to <strong>10</strong> flashcard sets.<br />
                    Current sets: <strong>{cardCount} / 10</strong>
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, padding: 2  }}>
                    <Button
                    
                        variant="contained" 
                        color="secondary" 
                        sx={{ mt: 2 }} 
                        onClick={handleUpgrade}
                    >
                        Upgrade to Pro for Unlimited Flashcard Sets and Storage
                    </Button>
                </Box>
            </>

            ) : (
                <Typography
                    variant="body1"
                    sx={{ textAlign: 'center', color: 'green', mt: 2 }}
                >
                    You have a <strong>Pro</strong> subscription with unlimited flashcard sets.
                    Enjoy <strong>unlimited access</strong> to flashcard creation and storage! :3
                </Typography>
            )}
            {filteredSets.length === 0 ? (
                <Typography variant="h6" align="center" sx={{ mt: 4 }}>
                    No flashcard sets found. Start creating your first set!
                </Typography>
            ) : (
                <Grid container spacing={3}>
                    {filteredSets.map((set) => (
                        <Grid item xs={12} sm={6} md={4} key={set.id}>
                            <Card 
                                onContextMenu={(e) => {
                                    if (subscriptionType === 'pro' || flashcardSets.indexOf(set) < 10) {
                                    e.preventDefault(); //prevent the browser context menu
                                    handleSelectSet(set.id); //Right-Click to select for deletion
                                    }
                                }}
                                sx={{
                                    border: selectedSet === set.id ? '3px solid red' : 'none', //Highlight selected set
                                    cursor: subscriptionType === 'pro' || flashcardSets.indexOf(set) < 10 ? 'pointer' : 'not-allowed', // change cursor
                                    opacity: subscriptionType === 'pro' || flashcardSets.indexOf(set) < 10 ? 1 : 0.5, // Dim disabled sets
                                }}
                            > 
                            
                            <Tooltip
                            title={
                                subscriptionType !== 'pro' && flashcardSets.indexOf(set) >= 10
                                    ? 'Upgrade to Pro to access all flashcard sets.'
                                    : ''
                            }
                            arrow
                        >
                            <Box>
                                <CardActionArea 
                                onClick={() => {
                                    if (subscriptionType === 'pro' || flashcardSets.indexOf(set) < 10) {
                                        router.push(`/flashcard?id=${set.id}`); // Navigate only if set is accessible
                                    }
                                }}  
                                    disabled={subscriptionType !== 'pro' && flashcardSets.indexOf(set) >= 10} // Disable clicks for basic users
                                    > 
                                    <CardContent>
                                        <Typography variant="h6" component="div">
                                            {set.name || "Untitled Set"}
                                        </Typography>
                                        {set.createdAt && (
                                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                               Created At: {set.createdAt ? set.createdAt.toLocaleString() : "N/A"}
                                            </Typography>
                                        )}
                                    </CardContent>
                                </CardActionArea>
                                </Box>
                                </Tooltip>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
            {selectedSet && (
                <Box sx={{textAlign: 'center', mt:4}}>
                    <Typography variant = "h6" color="error" sx={{mb:2}}>
                        Selected Set: {flashcardSets.find((set) => set.id === selectedSet)?.name || "untitled Set"}
                    </Typography>
                    <Button variant="contained" color="secondary" onClick={handleDeleteSet}
                    > 
                    Confirm Deletion
                    </Button>
                </Box>
            )}
        </Container>
    </Box>
    );
}
