import { Sequelize } from 'sequelize';

// Parametri di connessione letti da variabili d'ambiente con fallback
const dbName = process.env.DB_NAME || 'energydb';
const dbUser = process.env.DB_USER || 'energy';
const dbPass = process.env.DB_PASS || 'energy';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;

// Istanza Sequelize condivisa per l'applicazione (dialetto Postgres)
export const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  port: dbPort,
  dialect: 'postgres',
  logging: false,
});


