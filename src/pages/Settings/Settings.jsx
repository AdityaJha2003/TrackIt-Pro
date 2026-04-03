import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Palette, Loader2, Sparkles } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import './Settings.css';

const PRESET_COLORS = [
  '#2dd4bf', // Original Teal
  '#f43f5e', // Rose
  '#818cf8', // Indigo
  '#10b981', // Emerald
  '#fbbf24', // Amber
  '#0ea5e9', // Sky Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
];

const Settings = () => {
  const { userData, logout } = useAuth();
  const [selectedColor, setSelectedColor] = useState(userData?.brandColor || '#2dd4bf');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Helper to sync CSS variables for real-time preview
  const updatePreview = (color) => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', color);
    
    // Hex to RGB conversion
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (result) {
      const rgb = `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
      root.style.setProperty('--brand-primary-rgb', rgb);
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    updatePreview(color);
  };

  const handleSave = async () => {
    if (!userData?.company_id) return;
    
    setLoading(true);
    try {
      const companyRef = doc(db, 'companies', userData.company_id);
      await updateDoc(companyRef, {
        brand_color: selectedColor
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-container">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-primary/10 blur-[100px] pointer-events-none" />
      
      <header className="settings-header">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-3 rounded-full hover:bg-white/5 transition-all">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agency Settings</h1>
            <p className="text-brand-muted text-sm mt-1">
              Command Core for <span className="text-white">{userData?.companyName}</span>
            </p>
          </div>
        </div>
      </header>

      <main className="settings-content">
        <section className="settings-section">
          <div className="section-header">
            <div className="flex items-center gap-2 mb-2">
              <Palette size={20} className="text-brand-primary" />
              <h2 className="section-title">Brand Identity</h2>
            </div>
            <p className="section-subtitle">
              Define your agency's signature color. This will update the entire dashboard experience.
            </p>
          </div>

          <div className="color-grid">
            {PRESET_COLORS.map((color) => (
              <div 
                key={color}
                className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorChange(color)}
              >
                {selectedColor === color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check size={20} color={parseInt(color.replace('#',''), 16) > 0xffffff/2 ? '#000' : '#fff'} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="custom-color-picker">
            <div className="flex items-center gap-4">
              <div className="color-input-wrapper">
                <input 
                  type="color" 
                  value={selectedColor} 
                  onChange={(e) => handleColorChange(e.target.value)} 
                />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Custom Color</p>
                <p className="color-hex-display">{selectedColor.toUpperCase()}</p>
              </div>
            </div>
            <div className="ml-auto">
              <div className="flex items-center gap-2 text-xs py-1 px-3 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                <Sparkles size={12} />
                <span>Live Preview Active</span>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <div className="section-header">
            <h2 className="section-title">Company Info</h2>
            <p className="section-subtitle">Information currently tied to this workspace.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-xs text-brand-muted uppercase mb-1">Company Name</p>
              <p className="font-semibold">{userData?.companyName}</p>
            </div>
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <p className="text-xs text-brand-muted uppercase mb-1">Admin Email</p>
              <p className="font-semibold">{userData?.email}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="settings-footer">
        <div className="flex items-center gap-6">
          {success && (
            <p className="text-brand-primary text-sm font-medium flex items-center gap-2">
              <Check size={16} /> Identity Propagated Successfully
            </p>
          )}
          <button 
            className="save-button flex items-center gap-2"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Synchronize Identity'}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Settings;
