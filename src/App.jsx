import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Link } from 'react-router-dom';
import { TransactionTable } from './components/TransactionTable/TransactionTable';
import { StatCards } from './components/StatCards/StatCards';
import { AddEntryModal } from './components/AddEntryModal/AddEntryModal';
import { Plus, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { subscribeToTransactions } from './firebase/services';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Settings from './pages/Settings/Settings';

function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const { logout, userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userData?.company_id) {
      // Subscribing to real-time transactions for the company
      const unsubscribe = subscribeToTransactions(userData.company_id, (liveTransactions) => {
        setTransactions(liveTransactions);
      });
      return () => unsubscribe();
    }
  }, [userData]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleOpenModal = (data = null) => {
    setEditingData(data);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-brand-dark text-zinc-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background orbs responding to dynamic brand primary */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-secondary/10 blur-[100px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 animate-fade-in">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-brand-muted tracking-tight mb-1">
              {userData?.companyName || 'TrackItPro'}
            </h1>
            <p className="text-brand-muted text-sm tracking-wide uppercase">
              Financial Command Center • <span className="text-zinc-300 font-medium">Dashboard</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleOpenModal()}
              className="group flex items-center gap-2 bg-brand-primary hover:bg-opacity-80 text-brand-dark px-5 py-2.5 rounded-full font-semibold transition-all shadow-[0_0_15px_var(--brand-primary)] hover:shadow-[0_0_25px_var(--brand-primary)] active:scale-95"
            >
              <Plus size={18} className="transition-transform group-hover:rotate-90" />
              <span className="hidden sm:inline">New Entry</span>
            </button>
            <Link 
              to="/settings"
              className="p-2.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-brand-muted hover:text-white transition-all border border-white/5"
              title="Agency Settings"
            >
              <SettingsIcon size={20} />
            </Link>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 text-brand-muted hover:text-white transition-all border border-white/5"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main className="animate-slide-up">
          <StatCards transactions={transactions} />
          <TransactionTable transactions={transactions} onEdit={handleOpenModal} />
        </main>

        <AddEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} companyId={userData?.company_id} initialData={editingData} />
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
