import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db } from "./config";

// Fetch Transactions for a specific company in real-time
export const subscribeToTransactions = (company_id, callback) => {
  const q = query(
    collection(db, "transactions"), 
    where("company_id", "==", company_id),
    orderBy("date", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(transactions);
  });
};

// Add a new transaction
export const addTransaction = async (transactionData, company_id) => {
  try {
    await addDoc(collection(db, "transactions"), {
      ...transactionData,
      company_id,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error adding transaction:", error);
    throw error;
  }
};

// Update an existing transaction
export const updateTransaction = async (transactionId, updatedData) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    await updateDoc(transactionRef, {
      ...updatedData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

// Delete a transaction
export const deleteTransaction = async (transactionId) => {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    await deleteDoc(transactionRef);
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};
