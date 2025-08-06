// /app/check_subscription/page.js
'use server';

import { checkSubscription } from '@/utils/checkSubscription';

export default async function CheckSubscriptionPage({ searchParams }) {
  const userId = searchParams?.userId;

  if (!userId) {
    return <div>User ID not provided</div>;
  }

  const isActive = await checkSubscription(userId);
  return <div>{isActive ? 'Active' : 'Not Active'}</div>;
}