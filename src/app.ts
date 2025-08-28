import express from 'express';
import { json } from 'express';
import router from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();
app.use(json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', router);
app.use(notFound);
app.use(errorHandler);

export default app;


