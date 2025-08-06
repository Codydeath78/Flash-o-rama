'use client';
export const dynamic = 'force-dynamic'; // ⬅ force dynamic rendering
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from "next/navigation"
import { Box, CircularProgress, Container, Typography, Button } from '@mui/material';
import { setLogLevel } from 'firebase/firestore';
import { useThemeContext } from '@/app/toggle_theme/theme-context.js'; // Adjust path if needed
import { Brightness4, Brightness7} from '@mui/icons-material'; // Icons for dark mode toggle
import Link from 'next/link';
setLogLevel('debug');

const ResultPage = () => {
    const searchParams = useSearchParams();
    const session_id = searchParams.get('session_id'); // Get session_id from URL query params
    const router = useRouter()
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null);
    const [error, setError] = useState(null);



    useEffect(() => {
        const fetchCheckoutSession = async () => {
            if (!session_id) {
                setError('No session ID provided in the URL.');
                setLoading(false);
                return;
            }

            try {
                // Fetch session details from the backend
                const res = await fetch(`/api/checkout_session?session_id=${session_id}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error?.message || 'Failed to fetch session details.');
                }

                const sessionData = await res.json();
                console.log('Fetched session data:', sessionData); // Debugging log
                setSession(sessionData);

                //Send confirmation email after successful purchase
                //In your ResultPage component, after confirming payment_status === "paid", make a request to the email API to send the email.
                if (sessionData.payment_status === "paid"){
                    await fetch("/api/send_email", {
                        method: "POST",
                        headers: { "Content-Type": "application/json"},
                        body: JSON.stringify({
                            email: sessionData.customer_details.email,
                            amount: sessionData.amount_total,
                            currency: sessionData.currency,
                            sessionId: session_id,
                            subscriptionId: sessionData.subscription,
                        }),
                    });
                } else {
                    setError(sessionData.error?.message || "Failed to fetch session details.");
            }

            } catch (err) {
                console.error('Error fetching session:', err.message);
                setError(err.message || 'An error occurred while fetching session details.');
            } finally {
                setLoading(false);
            }
        };

        fetchCheckoutSession();
    }, [session_id]);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
                <CircularProgress />
                <Typography variant="h6">Loading...</Typography>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="h6" color="error">
                    {error}
                </Typography>
            </Container>
        );
    }

    if (!session) {
        return (
            <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="h6" color="error">
                    Session data not found.
                </Typography>
            </Container>
        );
    }

    return (
        <Box maxWidth="100vw" sx={{
            bgcolor: 'background.default', // Dynamically applies the theme's background
            color: 'text.primary', // Dynamically applies the theme's text color
            minHeight: '100vh', // Ensure the full screen is covered
            display: 'flex',
            flexDirection: 'column',
          }}>
        <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
            {session.payment_status === 'paid' ? (
                <>
                    <Typography variant="h4" color="success.main">
                        Thank you for your purchase!
                    </Typography>
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body1">
                            We have received your payment. You will receive an email with the order details shortly.
                        </Typography>


                        {session.invoiceUrl && (
                                <Typography variant="body1" sx={{ mt: 2 }} padding={2}>
                                    <Link href={session.invoiceUrl} target="_blank" rel="noopener">
                                        Download Your Invoice
                                    </Link>
                                </Typography>
                            )}





                        <Button
                            variant="contained"
                            color = "primary"
                            onClick={()=> router.push('/')}
                            fullWidth
                            sx={{mb: 2}}
                        > 
                            ← Back to Home Page 
                        </Button>
                    </Box>
                </>
            ) : (
                <>
                    <Typography variant="h4" color="error">
                        Payment Failed
                    </Typography>
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="body1">
                            Your payment was not successful. Please try again.
                        </Typography>
                    </Box>
                </>
            )}
        </Container>
        </Box>
    );
};


export default ResultPage;
