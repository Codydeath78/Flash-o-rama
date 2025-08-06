import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import sendCancellationEmail from '@/utils/sendCancelGrid'; // Utility to send email through SendGrid
//API route
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



export async function POST(req) {
    try {

        const body = await req.json();
        const { userId, subscriptionId } = body;

        if (!userId || !subscriptionId) {
            return NextResponse.json({ error: 'Missing userId or subscriptionId' }, { status: 400 });
        }

        // Cancel subscription in Stripe
        const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);

        if (deletedSubscription.status !== 'canceled') {
            throw new Error('Failed to cancel the subscription.');
        }

        // Update Firestore to reflect cancellation
        const userDocRef = doc(db, `cardstorage/${userId}`);
        await updateDoc(userDocRef, {
            subscriptionStatus: 'inactive',
            subscriptionType: 'none',
        });

        // Send cancellation email
        const emailResponse = await sendCancellationEmail(userId, deletedSubscription);

        return NextResponse.json({ success: true, emailResponse }, { status: 200 });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
