import sendgrid from '@sendgrid/mail';
import { db } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Stripe from "stripe";

//Set API keys
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Main Subscription Expiry Check
export default async function checkSubscriptionExpiry() {
    // Perform Subscription Expiry Check
    const today = new Date();
    const expiredUsers = [];

    try {
        const snapshot = await db.collection("cardstorage").get();
        for (const doc of snapshot.docs) {
            const userData = doc.data();
            const endDate = userData.subscriptionEndDate?.toDate();

            if (endDate && endDate < today && userData.subscriptionStatus === "active") {
                await doc.ref.update({
                    subscriptionStatus: "inactive",
                    subscriptionType: "none",
                });

                expiredUsers.push({
                    //email: userData.email, chat said no
                    userId: doc.id,
                    plan: userData.subscriptionType,
                });
            } else if (!endDate) {
                console.warn(`User ${doc.id} has no subscription end date.`);
            }

            }

        // Send Renewal Emails
        for (const user of expiredUsers) {
            const renewalUrl = await createRenewalCheckoutSession(user.userId, user.plan);
            await sendRenewalEmail(user.userId, renewalUrl);
        }

        console.log("Subscription expiry check completed.");
    } catch (error) {
        console.error("Error checking subscription expiry:", error);
    }

    return null;
}

// Send Renewal Email
async function sendRenewalEmail(userId, renewalUrl) {
    try {
        // Fetch the user document from Firestore
        const userDocRef = doc(db, `cardstorage/${userId}`);
        const userDocSnap = await getDoc(userDocRef);
        

        if (!userDocSnap.exists()) {
            throw new Error('User document not found for userId: ${userId}');
        }

        // Get the user's email from Firestore document //old
        //const userData = userDocSnap.data(); //old
        //const userEmail = userData.email;    //old


        const userEmail = userDocSnap.data().email; //new



        if (!userEmail) {
            throw new Error('User email is not found in Firestore for userId: ${userId}');
        }

        const msg = {
            to: userEmail,
            from: "flash.o.ramaofficial@gmail.com",
            subject: "Your Subscription Has Expired – Renew Now!",
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

        // Send the email
        const response = await sendgrid.send(msg);
        console.log('renewal email sent:', response);
        return response;

    } catch (error) {
        console.error('Error sending renewal email:', error);
        throw error;
    }
}

// Create Stripe Checkout Session
async function createRenewalCheckoutSession(userId, plan) {
    const planPriceId =
        plan === "pro"
            ? process.env.STRIPE_PRO_PRICE_ID
            : process.env.STRIPE_BASIC_PRICE_ID;

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            client_reference_id: userId,
            line_items: [
                {
                    price: planPriceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXT_BASE_URL}/result?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_BASE_URL}/`,
        metadata: {
            planType: plan // Pass subscription type in metadata
        }
        });

        
        console.log("Stripe session created:", session.url);
        return session.url;
    } catch (error) {
        console.error("Error creating renewal stripe checkout session:", error);
        throw error;
    }
}











