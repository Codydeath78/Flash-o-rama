//checking Subscription Status Before Accessing Premium Features:
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export async function checkSubscription(userId) {
    if (!userId) return false; //fix?

    try {
        const userDocRef = doc(db, `cardstorage/${userId}`);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().subscriptionId) {
            // User has a subscription ID stored in Firestore
            const subscriptionId = userDoc.data().subscriptionId;

            // Optionally, verify the subscription status via Stripe
            const response = await fetch(`/api/checkout_session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionId }),
            });

            const result = await response.json();
            return result.active; // Return true if subscription is active
        }
    } catch (error) {
        console.error('Error checking subscription:', error);
    }

    return false; // Deny access if no active subscription
}
