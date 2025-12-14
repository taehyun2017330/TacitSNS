import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  QueryConstraint
} from "firebase/firestore";
import { db } from "./config";

// Generic create document
export const createDocument = async (collectionName: string, data: any) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Generic read document by ID
export const getDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error("Document not found");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Generic get all documents in a collection
export const getAllDocuments = async (collectionName: string) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Generic query documents
export const queryDocuments = async (
  collectionName: string,
  ...queryConstraints: QueryConstraint[]
) => {
  try {
    const q = query(collection(db, collectionName), ...queryConstraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Generic update document
export const updateDocument = async (
  collectionName: string,
  documentId: string,
  data: any
) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Generic delete document
export const deleteDocument = async (collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Real-time listener for a collection
export const listenToCollection = (
  collectionName: string,
  callback: (data: any[]) => void,
  ...queryConstraints: QueryConstraint[]
) => {
  const q = query(collection(db, collectionName), ...queryConstraints);

  return onSnapshot(q, (querySnapshot) => {
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(documents);
  });
};

// Real-time listener for a single document
export const listenToDocument = (
  collectionName: string,
  documentId: string,
  callback: (data: any) => void
) => {
  const docRef = doc(db, collectionName, documentId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  });
};

// Export query helpers for easy use
export { where, orderBy, limit };
