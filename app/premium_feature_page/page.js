//import {useUser} from '@clerk/nextjs';
//import {checkSubscription} from '@/check_subscription/checkSubscription';


/*
export default async function PremiumFeaturePage() {
    const {user} = useUser();
    const hasAccess = await checkSubscription(user?.id);

    if(!hasAccess) {
        return(
            <div>
                <h1>Access Denied</h1>
                <p>You need an active subscription to access this feature.</p>
            </div>
        );
    }
    return (
        <div>
            <h1>Premium Feature</h1>
            <p>Welcome to the premium section!</p>
        </div>
    );
}
*/