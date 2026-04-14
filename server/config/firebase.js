import admin from 'firebase-admin';

let bucket;

export const initFirebase = () => {
  if (admin.apps.length) return; // already initialized

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Private key comes from .env with literal \n — convert to real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  bucket = admin.storage().bucket();
  console.log(`Firebase Storage ready: ${process.env.FIREBASE_STORAGE_BUCKET}`);
};

export const getStorageBucket = () => {
  if (!bucket) throw new Error('Firebase not initialized. Call initFirebase() first.');
  return bucket;
};
