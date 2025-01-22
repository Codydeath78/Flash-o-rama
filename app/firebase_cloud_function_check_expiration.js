//const functions = require("firebase-functions");
//const admin = require("firebase-admin");
//admin.initializeApp();

//exports.checkSubscriptionExpiration = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    //const now = admin.firestore.Timestamp.now();

    //const usersRef = admin.firestore().collection('cardstorage');
    //const snapshot = await usersRef.get();

    //const updates = [];

    //snapshot.forEach(doc => {
        //const userData = doc.data();
        //const subscriptionEndDate = userData.subscriptionEndDate;

        // Check if subscriptionEndDate exists and if expired
        //if (subscriptionEndDate && subscriptionEndDate.toMillis() <= now.toMillis()) {
            // Update subscription status to inactive if expired
            //updates.push(doc.ref.update({
                //subscriptionStatus: 'inactive',
                //subscriptionType: 'none'  // Optional - Reset type
            //}));
        //}
    //});

    //await Promise.all(updates);
    //console.log('Subscription statuses updated based on expiration.');

    //return null;
//});