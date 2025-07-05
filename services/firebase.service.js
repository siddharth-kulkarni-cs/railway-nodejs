// services/firebase.service.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let db;

function initializeFirebase() {
  if (db) {
    return;
  }

  // Check for Firebase credentials in environment variables
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.warn('Firebase service account key not found. Skipping Firebase initialization.');
    return;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

    initializeApp({
      credential: cert(serviceAccount)
    });

    db = getFirestore();
    console.log('Firebase initialized successfully.');
  } catch (error) {
    console.error('Error initializing Firebase:', error.message);
  }
}

// Automatically initialize when this module is loaded
initializeFirebase();

/**
 * Fetches sample data from a 'test' collection in Firestore.
 * @returns {Promise<Object[]>} A promise that resolves to an array of documents.
 */
async function getSampleData() {
  if (!db) {
    throw new Error('Firebase is not initialized.');
  }

  try {
    const snapshot = await db.collection('test-collection').limit(10).get();
    if (snapshot.empty) {
      console.log('No matching documents in test-collection.');
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching data from Firestore:', error);
    throw new Error('Could not fetch data from Firestore.');
  }
}

module.exports = {
  getSampleData
}; 