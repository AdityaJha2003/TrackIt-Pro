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
  getDocs
} from "firebase/firestore";
import { db } from "./config";

// Fetch Transactions for a specific company in real-time
export const subscribeToTransactions = (company_id, callback) => {
  const q = query(
    collection(db, "transactions"),
    where("company_id", "==", company_id)
  );

  return onSnapshot(q, (snapshot) => {
    const transactions = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      // Sort client-side to avoid needing a composite Firestore index
      .sort((a, b) => {
        const da = a.date ? new Date(a.date) : new Date(0);
        const db_ = b.date ? new Date(b.date) : new Date(0);
        return db_ - da;
      });
    callback(transactions);
  }, (error) => {
    console.error("subscribeToTransactions error:", error);
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

// ─── INVOICE SERVICES ────────────────────────────────────────────────────────

// Subscribe to invoices for a company in real-time
export const subscribeToInvoices = (company_id, callback) => {
  const q = query(
    collection(db, "invoices"),
    where("company_id", "==", company_id)
  );
  return onSnapshot(q, (snapshot) => {
    const invoices = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      // Sort client-side: newest first, to avoid needing a composite Firestore index
      .sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return tb - ta;
      });
    callback(invoices);
  }, (error) => {
    console.error("subscribeToInvoices error:", error);
  });
};

// Add a new invoice AND auto-create a linked Pending Inflow transaction
export const addInvoice = async (invoiceData, company_id) => {
  try {
    const invoiceRef = await addDoc(collection(db, "invoices"), {
      ...invoiceData,
      company_id,
      status: invoiceData.status || "draft",
      createdAt: serverTimestamp()
    });

    // Auto-create a linked Pending Inflow only when invoice is sent (not draft)
    if (invoiceData.status === "sent") {
      const txnRef = await addDoc(collection(db, "transactions"), {
        company_id,
        entity: invoiceData.client_name,
        project: invoiceData.line_items?.[0]?.description || "Invoice",
        amount: invoiceData.total_payable,
        type: "inflow",
        status: "pending",
        date: invoiceData.date,
        hasTds: (invoiceData.tds_percent || 0) > 0,
        tdsAmount: invoiceData.tds_amount || 0,
        netAmount: invoiceData.total_payable,
        invoice_id: invoiceRef.id,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "invoices", invoiceRef.id), {
        linked_txn_id: txnRef.id
      });
    }

    return invoiceRef.id;
  } catch (error) {
    console.error("Error adding invoice:", error);
    throw error;
  }
};

// Update invoice status and sync the linked transaction
export const updateInvoiceStatus = async (invoiceId, newStatus, linkedTxnId) => {
  try {
    await updateDoc(doc(db, "invoices", invoiceId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    if (linkedTxnId) {
      await updateDoc(doc(db, "transactions", linkedTxnId), {
        status: newStatus === "paid" ? "paid" : "pending",
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error updating invoice status:", error);
    throw error;
  }
};

// Get invoice count for generating sequential invoice numbers
export const getInvoiceCount = async (company_id) => {
  const q = query(collection(db, "invoices"), where("company_id", "==", company_id));
  const snap = await getDocs(q);
  return snap.size;
};
