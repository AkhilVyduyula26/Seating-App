// Import the Firebase scripts that are needed
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with the same config
const firebaseConfig = {
  "projectId": "seatassignai-bccvh",
  "appId": "1:810685611284:web:c4ef6119054b0c389f5601",
  "storageBucket": "seatassignai-bccvh.firebasestorage.app",
  "apiKey": "AIzaSyA45Y_geSqcPCxy_12zrfwI7AF6IqdJgcE",
  "authDomain": "seatassignai-bccvh.firebaseapp.com",
  "messagingSenderId": "810685611284"
};

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

// Optional: Add a background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/firebase-logo.png' // You can add a logo here
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
