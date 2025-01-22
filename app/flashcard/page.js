'use client';
import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { db } from '@/firebase';
import { useSearchParams, useRouter } from "next/navigation";
import { Container, Typography, Box, CardActionArea, CardContent, Grid, Button } from '@mui/material';
import { useThemeContext } from '@/app/toggle_theme/theme-context';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { jsPDF } from 'jspdf';
//import annyang from 'annyang'; // Import annyang for voice commands, this causes error
//THOSE WHO KNOW!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//LOCK IN!
//AI THIS!
//PLEASE DEPLOY!

export default function Flashcard() {
    const { isLoaded, isSignedIn, user } = useUser();
    const [flashcards, setFlashcards] = useState([]);
    const [flipped, setFlipped] = useState({});
    const [createdAt, setCreatedAt] = useState(null); // Add state for timestamp
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { mode, toggleTheme } = useThemeContext();
    const [activeIndex, setActiveIndex] = useState(0); // Track the active card
    const [subscriptionType, setSubscriptionType] = useState(null); // Subscription type
    const annyangInitialized = useRef(false); // Prevent reinitialization
    const [voiceActive, setVoiceActive] = useState(false); // Track if voice commands are active
    const activeIndexRef = useRef(0);

    const searchParams = useSearchParams();
    const search = searchParams.get('id');
    const router = useRouter();
    const cardRefs = useRef([]); // Array to store references to each card


    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width; // Get the width of the page
        const text = `Flashcard Set: ${search}`;
        const textWidth = doc.getTextWidth(text); // Get the width of the text
        const h = (pageWidth - textWidth) / 2; // Calculate the center position
        doc.setFontSize(16);
        doc.text(text, h, 10);
        let y = 20;
        
        flashcards.forEach((flashcard, index) => {
            doc.setFontSize(12);
            // Render the question
            const question = `Q: ${flashcard.front}`;
            doc.text(question, 10, y, { maxWidth: 190 });
            y += doc.getTextDimensions(question).h + 4;

            // Render the answer
            const answer = `A: ${flashcard.back}`;
            doc.text(answer, 10, y, { maxWidth: 190 });
            y += doc.getTextDimensions(answer).h + 8;

            // Add a new page if content exceeds page height
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
        });

        doc.save("flashcards.pdf");
    };



 // Voice Command Integration
 useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
        const initializeVoiceCommands = async () => {
            try {
                const userDocRef = doc(db, `cardstorage/${user.id}`);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const fetchedSubscriptionType = userDocSnap.data().subscriptionType;
                    console.log('Fetched subscription type:', fetchedSubscriptionType);
                    setSubscriptionType(fetchedSubscriptionType);

                    if (fetchedSubscriptionType === 'pro') {
                        const module = await import('annyang');
                        const annyang = module.default;

                        if (!annyang || (!window.SpeechRecognition && !window.webkitSpeechRecognition)) {
                            console.warn('Voice commands not supported in this browser.');
                            return;
                        }

                        console.log('Annyang successfully loaded.');
                        console.log('Voice commands initialized for Pro user.');

                        // Define recognized commands
                        const recognizedCommands = {
                            'Start.': () => {
                                
                                setVoiceActive(true);
                                console.log('Voice command: Start');
                               // Reinitialize voice commands after a stop
                               if (!annyang.isListening()) {
                                annyang.start({ autoRestart: true, continuous: true });
                                console.log('Voice command: Reinitializing Annyang');
                                
                            }
                             
                            },
                            'Next.': () => {
                                if (flashcards.length > 0) {
                                    setActiveIndex((prev) => {
                                        const nextIndex = (prev + 1) % flashcards.length;
                                        activeIndexRef.current = nextIndex; // Update the ref
                                        console.log('Voice command: Next card. Moving to Index: ', nextIndex);
                                        return nextIndex;
                                    });
                                }
                            },
                            'Previous.': () => {
                                if (flashcards.length > 0) {
                                    setActiveIndex((prev) => {
                                        const prevIndex = (prev - 1 + flashcards.length) % flashcards.length;
                                        activeIndexRef.current = prevIndex; // Update the ref
                                        console.log('Voice command: Previous card. Moving to Index:', prevIndex);
                                        return prevIndex;
                                    });
                                }
                            },
                            'Flip.': () => {
                                const currentIndex = activeIndexRef.current; // Get the most recent index
    setFlipped((prev) => ({
        ...prev,
        [currentIndex]: !prev[currentIndex],
    }));
    console.log(`Voice command: Flip card at Index: ${currentIndex}`);
                            },
                            'Stop.': () => {
                                
                                setVoiceActive(false);
                                console.log('Voice command: Stop');
                                annyang.abort();
                                
                                
                            },
                        };


                        // Log commands to confirm they're registered
                        console.log('Registered commands:', recognizedCommands);

                        // // Remove any existing commands or callbacks
                        annyang.removeCommands();
                        annyang.removeCallback('resultMatch');
                        annyang.removeCallback('resultNoMatch');

                        // Add the commands to Annyang
                        annyang.addCommands(recognizedCommands);

                        // Use resultMatch for recognized phrases
                        annyang.addCallback('resultMatch', (command, phrases) => {
                            console.log(`Matched Command: ${command}`, `Recognized Phrases:, ${phrases}`);
                        });

                        // Use resultNoMatch for unrecognized phrases
                        annyang.addCallback('resultNoMatch', (phrases) => {
                            console.log('Unrecognized phrases:', phrases);
                        });

                        // Debug the speech recognizer state
                        console.log('Speech Recognizer State:', annyang.getSpeechRecognizer());

                        // Start Annyang with proper settings initially
                        if (!annyang.isListening()) {
                            annyang.start({ autoRestart: true, continuous: true });
                        }

                        // Mark Annyang as initialized
                        annyangInitialized.current = true;

                        return () => {
                            annyang.abort();
                            
                        };
                    } else {
                        console.warn('Voice commands not enabled for non-Pro user.');
                    }
                } else {
                    console.warn('No user document found in Firestore.');
                }
            } catch (err) {
                console.error('Error initializing voice commands:', err);
            }
        };

        
        if (!annyangInitialized.current || !voiceActive) {
            initializeVoiceCommands();
        }
    }
}, [isLoaded, user, flashcards, activeIndex, voiceActive]);
  
useEffect(() => {
    activeIndexRef.current = activeIndex;
}, [activeIndex]);


































    // Fetch flashcards and user subscription details
    useEffect(() => {
        async function getFlashcard() {
            if (!search || !user) return;

            try {
                setLoading(true);
                const docRef = doc(db, `cardstorage/${user.id}/cards`, search);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    console.log("Fetched flashcards document:", data);

                    // Set flashcards and createdAt timestamp
                    setFlashcards(data.flashcards || []);
                    setCreatedAt(data.createdAt?.toDate()); // Convert Firestore timestamp to JS Date
                } else {
                    console.warn("No such document!");
                    setFlashcards([]);
                }
                const userDocRef = doc(db, `cardstorage/${user.id}`);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setSubscriptionType(userDocSnap.data().subscriptionType);
                }
            } catch (err) {
                console.error("Error fetching flashcards:", err);
                setError("Failed to load flashcards. Please try again.");
            } finally {
                setLoading(false);
            }
        }
        getFlashcard();
    }, [user, search]);





    // Handle keyboard navigation
// Handle keyboard navigation dynamically
useEffect(() => {
    console.log('Keyboard navigation updated. VoiceActive:', voiceActive);

    const handleKeyDown = (event) => {
        if (!flashcards.length || subscriptionType !== 'pro' || voiceActive) return;

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

    if (!voiceActive) {
        // Add event listener if voice commands are not active
        window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
        // Clean up the event listener
        window.removeEventListener('keydown', handleKeyDown);
    };
}, [flashcards, activeIndex, subscriptionType, voiceActive]);


// Ensure the active card is highlighted when switching back from voice commands
useEffect(() => {
    // Scroll the active card into view whenever it changes
    if (!voiceActive && subscriptionType === 'pro' && cardRefs.current[activeIndex]) {
        cardRefs.current[activeIndex].scrollIntoView({
            behavior: 'smooth',
            block: 'center', // Adjust scrolling position (center, start, or end)
        });
    }
}, [voiceActive, activeIndex, subscriptionType]);




    const handleCardClick = (id) => {
        setFlipped((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
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
            
            <Typography variant="h6" align="center" sx={{ mt: 50 }}>
                Loading flashcard set... Please wait.
            </Typography>
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
        <Container maxWidth="md" sx={{mt: 4}}>
            <Button
                variant="contained"
                color = "primary"
                onClick={()=> router.push('/flashcards')}
                sx={{mb: 2}}
                > 
                ← Back to All Flashcard Sets
            </Button>



            <Typography variant="h4" align="center" gutterBottom>
                Studying: {search}
            </Typography>
            {createdAt && ( // Display timestamp if available
                <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
                    Created At: {createdAt.toLocaleString()}
                </Typography>
            )}




            {subscriptionType === 'pro' ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4}}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={generatePDF}
                    >
                        Download as PDF
                    </Button>
                </Box>
                ) : (
                    <Typography variant="body1" align="center" sx={{ color: 'red', mb: 4 }}>
                        Upgrade to Pro to download this flashcard set as a PDF!
                    </Typography>
                )}
            <Grid container spacing={3} sx={{ mt: 4 }}>
                {flashcards.length === 0 ? (
                    <Typography variant="h6" align="center" sx={{ mt: 4, width: '100%' }}>
                        No flashcards found.
                    </Typography>
                ) : (
                    flashcards.map((card, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <CardActionArea 
                            ref={(el) => (cardRefs.current[index] = el)} // Assign the ref
                            onClick={() => handleCardClick(index)}
                                sx={{
                                    border: !voiceActive && subscriptionType === 'pro' && activeIndex === index ? '2px solid blue' : 'none', // Highlight active card only for pro users.
                                }}
                                >
                                <CardContent>
                                    <Box
                                        sx={{
                                            perspective: '1000px',
                                            '& > div': {
                                                transition: 'transform 0.6s',
                                                outline: '5px solid',
                                                transformStyle: 'preserve-3d',
                                                position: 'relative',
                                                width: '100%',
                                                height: '200px',
                                                boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
                                                transform: flipped[index]
                                                    ? 'rotateY(180deg)'
                                                    : 'rotateY(0deg)',
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
                                            },
                                            '& > div > div:nth-of-type(2)': {
                                                transform: 'rotateY(180deg)',
                                            },
                                        }}
                                    >
                                        <div>
                                            <div>
                                                <Typography variant="h5">{card.front}</Typography>
                                            </div>
                                            <div>
                                                <Typography variant="h5">{card.back}</Typography>
                                            </div>
                                        </div>
                                    </Box>
                                </CardContent>
                            </CardActionArea>
                        </Grid>
                    ))
                )}
            </Grid>
        </Container>
    </Box>
    );
}