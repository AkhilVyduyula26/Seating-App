
'use server';

import { getFirebaseAdminApp } from './firebase-admin';

export async function sendNotificationsAction() {
    try {
        const admin = getFirebaseAdminApp();
        const firestore = admin.firestore();
        const messaging = admin.messaging();
        
        const studentsSnapshot = await firestore.collection('students').get();
        
        if (studentsSnapshot.empty) {
            console.log('No students found to send notifications.');
            return { success: true, message: 'No registered student devices to notify.' };
        }

        const tokens: string[] = [];
        studentsSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fcmToken) {
                tokens.push(data.fcmToken);
            }
        });

        if (tokens.length === 0) {
            console.log('No FCM tokens found.');
            return { success: true, message: 'No student devices have registered for notifications.' };
        }
        
        // Deduplicate tokens
        const uniqueTokens = [...new Set(tokens)];

        const message = {
            notification: {
                title: 'Seating Plan Generated!',
                body: 'Your exam seat has been generated. Tap to view your details.',
            },
            webpush: {
                fcmOptions: {
                    // This link should point to your app's student login page
                    link: '/', 
                },
            },
        };

        const response = await messaging.sendToDevice(uniqueTokens, message);
        
        console.log('Successfully sent message:', response);

        // Optional: Clean up invalid tokens from Firestore based on the response
        const tokensToDelete: Promise<any>[] = [];
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', uniqueTokens[index], error);
                if (
                    error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered'
                ) {
                    // Find the document with this token and remove it
                    const tokenToRemove = uniqueTokens[index];
                    const docRef = firestore.collection('students').where('fcmToken', '==', tokenToRemove);
                    tokensToDelete.push(docRef.get().then(snap => snap.forEach(doc => doc.ref.update({ fcmToken: null }))));
                }
            }
        });

        await Promise.all(tokensToDelete);

        return { success: true, sent: response.successCount, failed: response.failureCount };

    } catch (error) {
        console.error('Error sending push notifications:', error);
        return { success: false, error: 'Failed to send push notifications.' };
    }
}
