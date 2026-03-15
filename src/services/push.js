import { getMessaging, getToken } from "firebase/messaging";
import { app } from "./firebase";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

const messaging = getMessaging(app);

export async function registrarPush(uid) {
  const permission = await Notification.requestPermission();

  if (permission !== "granted") return;

  const token = await getToken(messaging, {
    vapidKey: "BAqRHo96CSlN9G01QHjJz4IYPkBMLKXPcb3BU5zhSeYhTaWwnC2929RNN53ip718fvXaA_4OlN4JPA7omL6-LQo"
  });

  if (!token) return;

  await updateDoc(doc(db, "users", uid), {
    fcmToken: token
  });
}

