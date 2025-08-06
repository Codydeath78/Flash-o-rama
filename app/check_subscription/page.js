// /app/check_subscription/page.js
'use server'; //frfr

import { checkSubscription } from '@/utils/checkSubscription';

export default async function CheckSubscriptionPage() {
  const isActive = await checkSubscription(userId);

  return <div>{isActive ? 'Active' : 'Not Active'}</div>;
}