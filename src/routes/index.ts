import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import authRoutes from './auth.js';
import producerRoutes from './producer.js';
import consumerRoutes from './consumer.js';
import statsRoutes from './stats.js';

// Router principale che compone le sottorotte del dominio
const router = Router();

// Restituisce le informazioni dell'utente autenticato
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Monta le aree funzionali
router.use('/auth', authRoutes);
router.use('/producer', producerRoutes);
router.use('/consumer', consumerRoutes);
router.use('/stats', statsRoutes);

export default router;


