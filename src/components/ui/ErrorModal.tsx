
import React from 'react';
import { AlertTriangle, RefreshCw, UserPlus, ArrowRight } from 'lucide-react';
import { ErrorCode } from '../../types/errors';

interface ErrorModalProps {
  code: ErrorCode | string | null;
  onClose: () => void;
  onAction?: (action: 'retry' | 'waitlist' | 'restart') => void;
}

interface ErrorConfig {
  title: string;
  message: string;
  ctaText?: string;
  actionType?: 'retry' | 'waitlist' | 'restart';
  icon: React.ReactNode;
  color: string;
}

const ERROR_CONFIGS: Record<string, ErrorConfig> = {
  [ErrorCode.SEATS_JUST_TAKEN]: {
    title: 'Posti non più disponibili',
    message: 'Qualcuno è stato più veloce! I posti che avevi selezionato sono stati appena confermati da un altro utente.',
    ctaText: 'Entra in lista d\'attesa',
    actionType: 'waitlist',
    icon: <AlertTriangle className="text-amber-500" size={24} />,
    color: 'amber'
  },
  [ErrorCode.BUS_FULL]: {
    title: 'Bus al completo',
    message: 'Spiacenti, non ci sono più posti disponibili su questo bus per la quantità richiesta.',
    ctaText: 'Lista d\'attesa',
    actionType: 'waitlist',
    icon: <AlertTriangle className="text-rose-500" size={24} />,
    color: 'rose'
  },
  [ErrorCode.HOLD_EXPIRED]: {
    title: 'Sessione Scaduta',
    message: 'Il tempo a disposizione per completare la prenotazione è terminato. I posti sono stati liberati.',
    ctaText: 'Riprendi prenotazione',
    actionType: 'restart',
    icon: <RefreshCw className="text-indigo-500" size={24} />,
    color: 'indigo'
  },
  [ErrorCode.RATE_LIMIT_EXCEEDED]: {
    title: 'Troppe richieste',
    message: 'Stai effettuando operazioni troppo velocemente. Attendi un istante e riprova.',
    ctaText: 'Riprova ora',
    actionType: 'retry',
    icon: <AlertTriangle className="text-slate-500" size={24} />,
    color: 'slate'
  },
  default: {
    title: 'Errore imprevisto',
    message: 'Si è verificato un problema tecnico durante l\'operazione. Riprova tra qualche istante.',
    ctaText: 'Riprova',
    actionType: 'retry',
    icon: <AlertTriangle className="text-rose-500" size={24} />,
    color: 'rose'
  }
};

export const ErrorModal: React.FC<ErrorModalProps> = ({ code, onClose, onAction }) => {
  if (!code) return null;

  const config = ERROR_CONFIGS[code] || ERROR_CONFIGS.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white/5 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            {config.icon}
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{config.title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {config.message}
          </p>
          
          <div className="flex flex-col gap-2">
            {config.ctaText && onAction && (
              <button
                onClick={() => onAction(config.actionType!)}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white transition-transform active:scale-95 shadow-lg ${
                  config.color === 'amber' ? 'bg-amber-500 shadow-amber-200' :
                  config.color === 'rose' ? 'bg-rose-500 shadow-rose-200' :
                  'bg-indigo-600 shadow-indigo-200'
                }`}
              >
                {config.actionType === 'waitlist' && <UserPlus size={18} />}
                {config.actionType === 'retry' && <RefreshCw size={18} />}
                {config.actionType === 'restart' && <ArrowRight size={18} />}
                {config.ctaText}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full py-3 text-slate-500 font-semibold text-sm hover:text-slate-800 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
