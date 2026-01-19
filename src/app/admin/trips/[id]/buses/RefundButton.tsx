
'use client';

import React, { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

export const RefundButton = ({ bookingId, amount }: { bookingId: string, amount: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    if (!confirm(`Confermi il rimborso di €${amount}? L'operazione su Stripe è irreversibile.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch('/.netlify/functions/admin-refund', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}` 
        },
        body: JSON.stringify({ bookingId, reason })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert(`Rimborso completato! Eseguito: €${data.refundedAmount}`);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="flex items-center gap-1 text-xs text-rose-600 font-bold hover:underline">
      <RotateCcw size={12} /> Rimborso
    </button>
  );

  return (
    <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-lg space-y-2">
      <p className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
        <AlertTriangle size={10} /> Motivo del rimborso
      </p>
      <input 
        type="text" 
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full text-xs p-2 border rounded"
        placeholder="es: Richiesta cliente per malattia"
      />
      <div className="flex gap-2">
        <button 
          onClick={handleRefund}
          disabled={loading || reason.length < 5}
          className="bg-rose-600 text-white text-[10px] px-3 py-1 rounded font-bold disabled:opacity-50"
        >
          {loading ? 'Processando...' : 'Conferma'}
        </button>
        <button onClick={() => setIsOpen(false)} className="text-[10px] text-slate-500 font-bold">Annulla</button>
      </div>
    </div>
  );
};
