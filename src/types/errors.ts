
export enum ErrorCode {
  SEATS_JUST_TAKEN = 'SEATS_JUST_TAKEN',
  HOLD_EXPIRED = 'HOLD_EXPIRED',
  BUS_FULL = 'BUS_FULL',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SEATS_JUST_TAKEN]: 'Spiacenti, i posti sono stati appena prenotati da un altro utente. Riprova con una quantità inferiore o un altro bus.',
  [ErrorCode.HOLD_EXPIRED]: 'La tua sessione di prenotazione è scaduta. I posti sono stati liberati, ricomincia il processo.',
  [ErrorCode.BUS_FULL]: 'Il bus selezionato è ora al completo.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Stai effettuando troppe richieste. Attendi un istante prima di riprovare.',
  [ErrorCode.UNAUTHORIZED]: 'Sessione scaduta o non valida. Effettua nuovamente l\'accesso.',
  [ErrorCode.INTERNAL_ERROR]: 'Si è verificato un errore imprevisto. I nostri tecnici sono stati avvisati.'
};
