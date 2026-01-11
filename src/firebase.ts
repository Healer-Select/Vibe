
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { getAnalytics, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyC6w89q55MtGeZannvWbN0q7kyHyFC2Gz4",
  authDomain: "vibe-281a7.firebaseapp.com",
  projectId: "vibe-281a7",
  storageBucket: "vibe-281a7.firebasestorage.app",
  messagingSenderId: "1061556019702",
  appId: "1:1061556019702:web:b90be7cb4a9f91f08627d7",
  measurementId: "G-9TRH7G6SYL"
};

const VAPID_KEY = "BMxe4pBG12tJ9-fVib-59AWVr7iBElNh-QbNulmiJ3asClrzxlroNTIy9s5iWauGc5ueXsHb6We_nepNo_gtMxU";

let app: FirebaseApp | undefined;
let messaging: Messaging | undefined;
let analytics: Analytics | undefined;

try {
  // Initialize Firebase (check if already initialized)
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  if (typeof window !== 'undefined' && app) {
    analytics = getAnalytics(app);
    messaging = getMessaging(app);
  }
} catch (error) {
  console.log("Firebase init error (likely server-side or non-https)", error);
}

export const requestForToken = async () => {
  if (!messaging) return null;
  try {
    // CRITICAL FIX: Wait for the main service worker to be ready
    // This tells Firebase to use OUR sw.js, not look for a missing firebase-messaging-sw.js
    const registration = await navigator.serviceWorker.ready;

    const currentToken = await getToken(messaging, { 
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration 
    });

    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.log('No registration token available.');
      return null;
    }
  } catch (err) {
    console.log('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
        resolve(null);
        return;
    }
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
