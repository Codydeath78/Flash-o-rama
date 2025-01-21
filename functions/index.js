import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'; // Use v2 functions
import sendgrid from '@sendgrid/mail'; // Import SendGrid
import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

initializeApp(); // Initialize the Firebase Admin SDK
const db = getFirestore(); // Access Firestore

// Use Firebase Functions Config for environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

// Handle Firestore document updates
export const handleSubscriptionExpiration = onDocumentUpdated(
  { document: 'cardstorage/{userId}' },
  async (event) => {
    const beforeData = event.data.before.data(); // Data before the update
    const afterData = event.data.after.data(); // Data after the update


    console.log('afterData.subscriptionEndDate:', afterData.subscriptionEndDate);
    console.log('Type of subscriptionEndDate:', typeof afterData.subscriptionEndDate);

    const userId = event.params.userId;

    console.log('afterData:', afterData);

    // If subscriptionEndDate didn't change, exit
    if (!afterData || beforeData.subscriptionEndDate === afterData.subscriptionEndDate) {
      console.log('No changes to subscriptionEndDate. Exiting...');
      return;
    }

    // Parse subscriptionEndDate
    let subscriptionEndDate;
    try {
      subscriptionEndDate = parseDate(afterData.subscriptionEndDate);
      console.log(`Parsed subscriptionEndDate: ${subscriptionEndDate}`);
    } catch (error) {
      console.error(`Failed to parse subscriptionEndDate: ${error.message}`);
      return; // Exit function on error
    }

    // Ensure subscriptionEndDate is defined before using
    if (!subscriptionEndDate) {
      console.error('subscriptionEndDate is undefined. Exiting...');
      return;
    }

    console.log(`Subscription end date: ${subscriptionEndDate}`);
    const today = new Date();
    console.log(`Current date: ${today}`);

    // If the subscription is still active and not expired, exit
    if (subscriptionEndDate > today || afterData.subscriptionStatus !== 'active') {
      console.log('Subscription is still active or already inactive. Exiting...');
      return;
    }

    console.log(`Subscription expired for userId: ${userId}`);

    // Update Firestore to mark subscription as inactive
    try {
      await event.data.after.ref.update({
        subscriptionStatus: 'inactive',
        subscriptionType: 'none',
      });
      console.log(`Subscription updated to inactive for userId: ${userId}`);
    } catch (error) {
      console.error('Failed to update Firestore document:', error);
      return;
    }

    // Create a Stripe Checkout session for renewal
    let renewalUrl;
    try {
      renewalUrl = await createRenewalCheckoutSession(userId, afterData.subscriptionType);
    } catch (error) {
      console.error('Failed to create Stripe renewal session:', error);
      return;
    }

    // Send renewal email
    try {
      await sendRenewalEmail(afterData.email, renewalUrl);
      console.log(`Renewal email sent to userId: ${userId}`);
    } catch (error) {
      console.error('Failed to send renewal email:', error);
    }
  }
);

/**
 * Create Stripe Checkout Session for Renewal
 */
async function createRenewalCheckoutSession(userId, plan) {
  const planPriceId =
    plan === 'pro'
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
      success_url: `${process.env.BASE_URL}/result?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/cancelled`,
      metadata: {
        planType: plan // Pass subscription type in metadata
    }
    });

    console.log(`Stripe session created for userId: ${userId}: ${session.url}`);
    return session.url;
  } catch (error) {
    console.error(`Error creating Stripe session for userId: ${userId}`, error);
    throw error;
  }
}

/**
 * Send Renewal Email
 */
async function sendRenewalEmail(userEmail, renewalUrl) {
  try {
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
    console.error(`Error sending renewal email to: ${userEmail}`, error);
    throw error;
  }
}


function parseDate(dateValue) {
  console.log('Attempting to parse dateValue:', dateValue);
  if (dateValue?.toDate) {
    return dateValue.toDate(); // Firestore Timestamp
  } else if (dateValue instanceof Date) {
    return dateValue; // JavaScript Date
  } else if (typeof dateValue === 'string') {
    const parsedDate = new Date(dateValue);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    throw new Error(`Invalid date string: ${dateValue}`);
  } else {
    throw new Error(`Unsupported date format: ${JSON.stringify(dateValue)}`);
  }
}












