import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/utils/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import sendgrid from '@sendgrid/mail'; // Import SendGrid

// Initialize Stripe and SendGrid
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, subscriptionId, plan } = body;

        console.log("Request Body:", body);
        console.log("Validating Inputs - userId:", userId, "subscriptionId:", subscriptionId, "plan:", plan);

        if (!userId?.trim() || !subscriptionId?.trim() || !plan?.trim()) {
            return NextResponse.json({ error: 'Missing or empty userId, subscriptionId, or plan' }, { status: 400 });
        }

        // Retrieve subscription details from Firestore
        const userDocRef = doc(db, `cardstorage/${userId}`);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            return NextResponse.json({ error: `User document not found for userId: ${userId}` }, { status: 404 });
        }

        const firestoreData = userDocSnap.data();
        const subscriptionEndDate = firestoreData.subscriptionEndDate
            ? new Date(firestoreData.subscriptionEndDate)
            : null;

        console.log(`Firestore subscriptionEndDate: ${subscriptionEndDate}`);
        const today = new Date();

        // Check if subscription is expired based on Firestore data
        if (subscriptionEndDate && subscriptionEndDate >= today) {
            return NextResponse.json({
                error: 'Subscription is still active and not expired (based on Firestore data).',
            }, { status: 400 });
        }

        // Retrieve subscription from Stripe for additional validation
        let subscriptionDetails;
        try {
            console.log(`Retrieving subscriptionId: ${subscriptionId}`);
            subscriptionDetails = await stripe.subscriptions.retrieve(subscriptionId);
            console.log('Retrieved subscription from Stripe:', subscriptionDetails);
        } catch (error) {
            console.error('Error retrieving subscription from Stripe:', error);
            return NextResponse.json({ error: `Stripe error: ${error.message}` }, { status: 500 });
        }

        // Deactivate the expired subscription in Firestore
        try {
            console.log(`Deactivating subscription for userId: ${userId}`);
            await updateDoc(userDocRef, {
                subscriptionStatus: 'inactive',
                subscriptionType: 'none',
            });
            console.log('Firestore document updated successfully for expired subscription.');
        } catch (error) {
            console.error('Error updating Firestore document:', error);
            throw new Error('Failed to update Firestore document');
        }

        // Create a Stripe Checkout session for subscription renewal
        const renewalUrl = await createRenewalCheckoutSession(userId, plan);

        // Send a renewal email to the user
        const emailResponse = await sendRenewalEmail(userId, renewalUrl);

        return NextResponse.json({ success: true, emailResponse }, { status: 200 });
    } catch (error) {
        console.error(`Error processing subscription for userId: ${req.body?.userId || 'unknown'}`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function createRenewalCheckoutSession(userId, plan) {
    const planPriceId = plan === 'pro'
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_BASIC_PRICE_ID;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            client_reference_id: userId,
            line_items: [
                {
                    price: planPriceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_BASE_URL}/result?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_BASE_URL}/cancelled`,
        });

        console.log(`Stripe session created for userId: ${userId}:`, session.url);
        return session.url;
    } catch (error) {
        console.error(`Error creating Stripe session for userId: ${userId}`, error);
        throw error;
    }
}

async function sendRenewalEmail(userId, renewalUrl) {
    try {
        const userDocRef = doc(db, `cardstorage/${userId}`);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
            throw new Error(`User document not found for userId: ${userId}`);
        }

        const userEmail = userDocSnap.data().email;
        if (!userEmail) {
            throw new Error(`User email is missing for userId: ${userId}`);
        }

        const msg = {
            to: userEmail,
            from: 'flash.o.ramaofficial@gmail.com',
            subject: 'Your Subscription Has Expired – Renew Now!',
            html: `
                <h1>Your Subscription Has Expired</h1>
                <p>Your subscription has ended. Renew now to continue enjoying our services.</p>
                <a href="${renewalUrl}" 
                    style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                    Renew Subscription
                </a>
                <p>If you need assistance, feel free to reach out to support.</p>
            `,
        };

        const response = await sendgrid.send(msg);
        console.log(`Renewal email sent to: ${userEmail}`);
        return response;
    } catch (error) {
        console.error(`Failed to send renewal email for userId: ${userId}`, error);
        throw error;
    }
}