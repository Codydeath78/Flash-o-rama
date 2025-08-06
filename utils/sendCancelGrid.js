import sendgrid from '@sendgrid/mail';
import { db } from '@/utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

export default async function sendCancellationEmail(userId, subscription) {
    try {
        // Fetch the user document from Firestore
        const userDocRef = doc(db, `cardstorage/${userId}`);
        const userDocSnap = await getDoc(userDocRef);
        

        if (!userDocSnap.exists()) {
            throw new Error('User document not found.');
        }

        // Get the user's email from Firestore document
        const userData = userDocSnap.data();
        const userEmail = userData.email;

        if (!userEmail) {
            throw new Error('User email is not found in Firestore.');
        }

        const msg = {
            to: userEmail,
            from: 'flash.o.ramaofficial@gmail.com',
            subject: 'Subscription Cancellation Confirmation',
            text: `Hi there,

Your subscription has been successfully canceled. You will no longer be charged, and your access to the app has been revoked.

Subscription ID: ${subscription.id}

If you wish to renew your subscription, you can sign up again anytime.

Thank you for using Flash-o-rama!`,
            html: `<h1>Subscription Cancelled</h1>
                   <p>Hi there,</p>
                   <p>Your subscription has been successfully cancelled. You will no longer be charged, and your access to the app has been revoked.</p>
                   <p><strong>Subscription ID:</strong> ${subscription.id}</p>
                   <p>If you wish to renew, sign up anytime.</p>
                   <p>Thank you for using Flash-o-rama!</p>`,
        };

        // Send the email
        const response = await sendgrid.send(msg);
        console.log('Cancellation email sent:', response);
        return response;

    } catch (error) {
        console.error('Error sending cancellation email:', error);
        throw error;
    }
}

