import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/firebase'; // Import your Firestore configuration
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { setLogLevel } from 'firebase/firestore';
import { checkSubscription } from '@/app/check_subscription/page';
setLogLevel('debug');
//BACKEND
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const formatAmountForStripe = (amount, currency) => {
    return Math.round(amount * 100);
};

export async function GET(req) {
    const searchParams = req.nextUrl.searchParams;
    const session_id = searchParams.get('session_id');

    try {
        if (!session_id) {
            console.error('Session ID is missing.');
            return NextResponse.json(
                { error: { message: 'Session ID is required.' } },
                { status: 400 }
            );
        }




        // Retrieve the Stripe Checkout session
        const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
        //Retrieve subscription ID from the session
        const subscriptionId = checkoutSession.subscription; //subscription ID
        //const customerId = checkoutSession.customer; // Stripe customer ID NEVER USED!!!!!!!!!!

        // Get the invoice details
        const invoiceId = checkoutSession.invoice;
        let invoiceUrl = null;

        if (invoiceId) {
            const invoice = await stripe.invoices.retrieve(invoiceId);
            invoiceUrl = invoice.hosted_invoice_url; // Get the hosted invoice URL
        }










        if (!subscriptionId) {
            console.error("Subscription ID is missing.");
            throw new Error("Subscription ID is required.");
          } else {
            console.log("Attempting to write to Firestore:", { subscriptionId });
          }

        //Store the subscription ID in Firestore
        const userId = checkoutSession.client_reference_id; //// Ensure clientReferenceId is set during session creation

        const planType = checkoutSession.metadata.planType; // Retrieve subscription type from metadata
        // Validate userId against request.auth.uid (passed from frontend)
        if (!userId) {
            throw new Error("Permission denied: User ID missing.");
          } else {
            console.log("Validated userId:", userId);
          }

           // Retrieve subscription details to get the period end (expiration date)
        const subscriptionPeriod = await stripe.subscriptions.retrieve(subscriptionId);
        const subscriptionEndDate = new Date(subscriptionPeriod.current_period_end * 1000).toISOString();



        if (subscriptionId && userId) {
            const userDocRef = doc(db, `cardstorage/${userId}`);
            // Write to Firestore with admin privileges
            await setDoc(userDocRef, { subscriptionId, isAdmin: true, subscriptionStatus: 'active', subscriptionType: planType, email: checkoutSession.customer_details.email, subscriptionEndDate}, { merge: true }); // Store expiration date
            console.log("Firestore write successful for user:", userId);
          } else {
            console.error("Missing subscriptionId or userId");
          }



        //Extract details from the session
        const {
            customer_details: {name, email},
            amount_total,
            currency,
            subscription,
            id: session_Id,
            invoice,
        } = checkoutSession

        //Format the email content
        const emailSubject = `Thank You for Your Purchase!`;
        const emailText = `
        Thank you for your purchase!
        Your subscription will expire on: ${new Date(subscriptionEndDate).toDateString()}

        Here are your transaction details:
        - Name: ${name}
        - Email: ${email}
        - Amount Paid: $${(amount_total / 100).toFixed(2)} ${currency.toUpperCase()}
        - Subscription ID: ${subscription}
        - Invoice ID: ${invoice}
        - Session ID: ${session_Id}

        We appreciate your business!
        `;
        const emailHtml = `
        <h1>Thank You for Your Purchase!</h1>
            <p>Hi ${name},</p>
            <p>Your payment of <strong>$${(amount_total / 100).toFixed(2)} ${currency.toUpperCase()}</strong> was successful.</p>
            <p>Your subscription will expire on: <strong>${new Date(subscriptionEndDate).toDateString()}</strong></p>
            <p><strong>Transaction Details:</strong></p>
            <ul>
                <li>Email: ${email}</li>
                <li>Subscription ID: ${subscription}</li>
                <li>Invoice ID: ${invoice}</li>
                <li>Session ID: ${session_Id}</li>
            </ul>
            <p>We appreciate your business!</p>
        `;

        //Call the email API
        const emailResponse = await fetch(`${process.env.NEXT_BASE_URL}/api/send_email`,{
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: email,
                subject: emailSubject,
                text: emailText,
                html: emailHtml,
            }),
        });

        const emailResult = await emailResponse.json();

        if (!emailResponse.ok) {
            console.error('Email failed to send:', emailResult.error);
        }
        

        // Log the session data to the console as JSON
        console.log("Stripe Session Data", JSON.stringify(checkoutSession, null, 2));

        return NextResponse.json({ ...checkoutSession, invoiceUrl}); // Return the session data to the frontend
    } catch (error) {
        console.error('Error retrieving checkout session:', error);
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
}

export async function POST(req) {
    try {
    const origin = req.headers.get('origin');
    if (!origin) {
        console.error("Origin is undefined. Make sure the frontend sends the correct origin.");
        return new NextResponse("Origin is required", { status: 400 });
    }
      const body = await req.json();
      const { plan, userId} = body;
  
      if (!plan || !['basic', 'pro'].includes(plan)) {
        return NextResponse.json(
          { error: 'Invalid or missing subscription plan' },
          { status: 400 }
        );
      }
  
      // Plan-specific details
      const planDetails = {
        basic: { name: 'Basic Subscription', amount: 5 },
        pro: { name: 'Pro Subscription', amount: 10 },
      };
  
      const selectedPlan = planDetails[plan];
  
      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required to create a checkout session.' },
          { status: 400 }
        );
      }
  
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: selectedPlan.name,
              },
              unit_amount: selectedPlan.amount * 100, // Convert to cents
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/result?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/`,
        client_reference_id: userId, // This ties the session to the user
        metadata: {
            planType: plan // Pass subscription type in metadata
        }
      });
  
      return NextResponse.json(checkoutSession, { status: 200 });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      return NextResponse.json(
        { error: 'An unexpected error occurred. Please try again later.' },
        { status: 500 }
      );
    }
  }







  

  











  
