
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { ErrorCode, ErrorMessages } from '../../types/errors';

interface ErrorMessageProps {
  code?: string;
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorMessageProps> = ({ code, onRetry }) => {
  const message = ErrorMessages[code as ErrorCode] || ErrorMessages.INTERNAL_ERROR;

  return (
    <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex flex-col gap-3">
      <div className="flex gap-3">
        <AlertCircle className="text-rose-500 shrink-0" size={20} />
        <div>
          <p className="text-sm font-bold text-rose-900">Ops! Qualcosa è andato storto</p>
          <p className="text-sm text-rose-700">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-600 hover:text-rose-800 transition-colors"
        >
          <RefreshCw size={14} /> Riprova
        </button>
      )}
    </div>
  );
};
