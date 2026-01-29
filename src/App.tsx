
import React, { useEffect } from 'react';

const App: React.FC = () => {
  useEffect(() => {
    // Reindirizzamento temporaneo per visualizzare subito la nuova UI Admin
    window.location.href = '/admin/trips';
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Monte Rosa Bus</h1>
        <p className="text-slate-400">Reindirizzamento alla Dashboard Admin...</p>
      </div>
    </div>
  );
};

export default App;
