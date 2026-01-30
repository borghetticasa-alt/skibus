
export enum ErrorCode {
  SEATS_JUST_TAKEN = 'SEATS_JUST_TAKEN',
  HOLD_EXPIRED = 'HOLD_EXPIRED',
  BUS_FULL = 'BUS_FULL',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_INPUT = 'INVALID_INPUT',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.SEATS_JUST_TAKEN]: 'Spiacenti, i posti sono stati appena occupati. Riprova con un altro bus.',
  [ErrorCode.HOLD_EXPIRED]: 'La tua sessione di prenotazione è scaduta.',
  [ErrorCode.BUS_FULL]: 'Il bus selezionato è al completo.',
  [ErrorCode.PAYMENT_FAILED]: 'Il pagamento non è andato a buon fine.',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Troppe richieste. Riprova più tardi.',
  [ErrorCode.UNAUTHORIZED]: 'Sessione non valida o scaduta.',
  [ErrorCode.FORBIDDEN]: 'Non disponi dei permessi necessari.',
  [ErrorCode.INVALID_INPUT]: 'Dati inviati non validi.',
  [ErrorCode.UNKNOWN_ERROR]: 'Si è verificato un errore imprevisto.'
};

export function respondError(code: ErrorCode, statusCode: number = 400, customMessage?: string) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: false,
      error: {
        code,
        message: customMessage || ErrorMessages[code]
      }
    })
  };
}
