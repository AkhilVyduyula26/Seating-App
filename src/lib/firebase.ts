
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, Messaging } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from "firebase/firestore";


const firebaseConfig = {
  "projectId": "seatassignai-bccvh",
  "appId": "1:810685611284:web:c4ef6119054b0c389f5601",
  "storageBucket": "seatassignai-bccvh.firebasestorage.app",
  "apiKey": "AIzaSyA45Y_geSqcPCxy_12zrfwI7AF6IqdJgcE",
  "authDomain": "seatassignai-bccvh.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "810685611284"
};

let app: FirebaseApp;
let messaging: Messaging | undefined;

if (typeof window !== 'undefined') {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    messaging = getMessaging(app);
}

export const getMessagingToken = async () => {
    let currentToken = '';
    if (!messaging) return currentToken;
    
    try {
        currentToken = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
        // You need to generate this key in your Firebase project settings -> Cloud Messaging
    } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
    }
    
    return currentToken;
};

export const saveFCMToken = async (hallTicketNumber: string, token: string) => {
    if (!app) return;
    try {
        const db = getFirestore(app);
        const studentRef = doc(db, 'students', hallTicketNumber);
        await setDoc(studentRef, { fcmToken: token }, { merge: true });
    } catch(e) {
        console.error("Error saving FCM token:", e);
    }
}
