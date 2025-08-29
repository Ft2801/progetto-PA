import express from 'express';
import { json } from 'express';
import router from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

// Inizializza l'app Express e abilita il parsing del body JSON
const app = express();
app.use(json());

// Endpoint di healthcheck per verificare lo stato del servizio
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Monta tutte le rotte applicative sotto il prefisso /api
app.use('/api', router);
// Gestione 404 per rotte non trovate e handler errori centralizzato
app.use(notFound);
app.use(errorHandler);

export default app;


