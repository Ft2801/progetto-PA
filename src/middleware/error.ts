import { NextFunction, Request, Response } from 'express';

// Errore HTTP applicativo con status code e dettagli opzionali
export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Middleware 404 per risorse non trovate
export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not Found' });
}

// Handler globale degli errori: logga e risponde con 500 se non è un HttpError
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal Server Error' });
}



