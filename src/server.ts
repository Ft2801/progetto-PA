import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { json } from 'express';
import app from './app.js';
import { sequelize } from './shared/db.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function start() {
  try {
    await sequelize.authenticate();
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

void start();


