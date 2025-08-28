import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import authRoutes from './auth.js';
import producerRoutes from './producer.js';
import consumerRoutes from './consumer.js';
import statsRoutes from './stats.js';
const router = Router();
router.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});
router.use('/auth', authRoutes);
router.use('/producer', producerRoutes);
router.use('/consumer', consumerRoutes);
router.use('/stats', statsRoutes);
export default router;
