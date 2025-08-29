import { Router } from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';

// Rotte di autenticazione: registrazione e login
const router = Router();

// Registrazione utente (producer o consumer)
router.post(
  '/register',
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').isString().notEmpty(),
  body('role').isIn(['producer', 'consumer']),
  authController.register
);

// Login utente: ritorna un JWT firmato
router.post(
  '/login',
  body('email').isEmail(),
  body('password').isString().notEmpty(),
  authController.login
);

export default router;



