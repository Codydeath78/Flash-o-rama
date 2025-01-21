import { loadStripe } from "@stripe/stripe-js";
let stripePromise;
const getStripe = () => { //This utility function ensures that we only create one instance of Stripe, reusing it if it already exists.
    if(!stripePromise){
        stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
    }
    return stripePromise;
}

export default getStripe;