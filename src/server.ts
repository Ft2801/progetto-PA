import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { json } from 'express';
import app from './app.js';
import { sequelize } from './shared/db.js';

// Porta di ascolto del server, con fallback a 3000
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Avvio dell'applicazione: verifica DB, sincronizzazione modelli e start HTTP
async function start() {
  try {
    // Verifica la connessione al database
    await sequelize.authenticate();
    // Sincronizza i modelli con il database (crea tabelle se mancanti)
    await sequelize.sync();
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

// Esegue l'avvio senza attendere il valore di ritorno
void start();


