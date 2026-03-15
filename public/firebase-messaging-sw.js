importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
 apiKey: "AIzaSyCVEcJDUhaHRtRPVwXorJvORZ6TasysurM",
  authDomain: "ponto-app-1c55a.firebaseapp.com",
  projectId: "ponto-app-1c55a",
  storageBucket: "ponto-app-1c55a.firebasestorage.app",
  messagingSenderId: "809643426461",
  appId: "1:809643426461:web:4cd8d5824a47ee4fc0ca74"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;

  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon-192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

