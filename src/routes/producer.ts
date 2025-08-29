import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Producer } from '../models/Producer.js';
import { ProducerCapacity } from '../models/ProducerCapacity.js';
import { Reservation } from '../models/Reservation.js';
import dayjs from 'dayjs';
import { User } from '../models/User.js';

// Rotte lato produttore: profilo, capacità, prezzi, occupazione, ricavi e accettazione proporzionale
const router = Router();

// Crea o aggiorna il profilo del produttore
router.post(
  '/profile',
  authenticate,
  requireRole(['producer', 'admin']),
  body('energyType').isIn(['Fossile', 'Eolico', 'Fotovoltaico']),
  body('co2PerKwh').isFloat({ min: 0 }),
  body('pricePerKwh').optional().isFloat({ min: 0 }),
  body('defaultMaxPerHourKwh').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const userId = req.user!.sub;
    const { energyType, co2PerKwh, pricePerKwh, defaultMaxPerHourKwh } = req.body as {
      energyType: 'Fossile' | 'Eolico' | 'Fotovoltaico';
      co2PerKwh: number;
      pricePerKwh?: number;
      defaultMaxPerHourKwh: number;
    };
    const [producer, created] = await Producer.findOrCreate({
      where: { userId },
      defaults: { userId, energyType, co2PerKwh, pricePerKwh: pricePerKwh ?? 0, defaultMaxPerHourKwh },
    });
    if (!created) {
      await producer.update({ energyType, co2PerKwh, pricePerKwh: pricePerKwh ?? producer.pricePerKwh, defaultMaxPerHourKwh });
    }
    return res.json({ id: producer.id });
  }
);

// Imposta/aggiorna capacità per uno o più slot orari in una data
router.post(
  '/capacities',
  authenticate,
  requireRole(['producer', 'admin']),
  body('date').isISO8601().toDate(),
  body('slots').isArray({ min: 1 }),
  body('slots.*.hour').isInt({ min: 0, max: 23 }),
  body('slots.*.maxCapacityKwh').isFloat({ min: 0 }),
  body('slots.*.pricePerKwh').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const userId = req.user!.sub;
    const producer = await Producer.findOne({ where: { userId } });
    if (!producer) return res.status(400).json({ error: 'Producer profile not found' });
    const dateStr = dayjs(req.body.date).format('YYYY-MM-DD');
    const slots = req.body.slots as Array<{ hour: number; maxCapacityKwh: number; pricePerKwh?: number }>;
    for (const s of slots) {
      if (s.maxCapacityKwh > Number(producer.defaultMaxPerHourKwh)) {
        return res.status(400).json({ error: `maxCapacityKwh exceeds producer defaultMaxPerHourKwh (${producer.defaultMaxPerHourKwh})` });
      }
    }
    const results: number[] = [];
    for (const s of slots) {
      const [cap] = await ProducerCapacity.findOrCreate({
        where: { producerId: producer.id, date: dateStr, hour: s.hour },
        defaults: { producerId: producer.id, date: dateStr, hour: s.hour, maxCapacityKwh: s.maxCapacityKwh, pricePerKwh: s.pricePerKwh ?? producer.pricePerKwh },
      });
      await cap.update({ maxCapacityKwh: s.maxCapacityKwh, pricePerKwh: s.pricePerKwh ?? cap.pricePerKwh });
      results.push(cap.id);
    }
    return res.json({ capacities: results });
  }
);

// Occupazione per un produttore in un intervallo orario per una certa data
router.get(
  '/occupancy',
  authenticate,
  requireRole(['producer', 'admin']),
  query('date').isISO8601(),
  query('fromHour').optional().isInt({ min: 0, max: 23 }),
  query('toHour').optional().isInt({ min: 0, max: 23 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const userId = req.user!.sub;
    const producer = await Producer.findOne({ where: { userId } });
    if (!producer) return res.status(400).json({ error: 'Producer profile not found' });
    const dateStr = dayjs(req.query.date as string).format('YYYY-MM-DD');
    const fromHour = req.query.fromHour ? Number(req.query.fromHour) : 0;
    const toHour = req.query.toHour ? Number(req.query.toHour) : 23;
    const capacities = await ProducerCapacity.findAll({ where: { producerId: producer.id, date: dateStr } });
    const reservations = await Reservation.findAll({ where: { producerId: producer.id, date: dateStr, status: 'reserved' } });
    const result: Array<{ hour: number; capacity: string; reserved: string; occupancyPct: number }> = [];
    for (let h = fromHour; h <= toHour; h++) {
      const cap = capacities.find(c => c.hour === h);
      const capKwh = cap ? Number(cap.maxCapacityKwh) : 0;
      const resKwh = reservations.filter(r => r.hour === h).reduce((sum, r) => sum + Number(r.kwh), 0);
      const pct = capKwh === 0 ? 0 : Math.min(100, (resKwh / capKwh) * 100);
      result.push({ hour: h, capacity: capKwh.toFixed(3), reserved: resKwh.toFixed(3), occupancyPct: Math.round(pct * 100) / 100 });
    }
    return res.json({ date: dateStr, data: result });
  }
);

export default router;

// Aggiorna i prezzi per uno o più slot orari in una data
router.post(
  '/prices',
  authenticate,
  requireRole(['producer', 'admin']),
  body('date').isISO8601(),
  body('slots').isArray({ min: 1 }),
  body('slots.*.hour').isInt({ min: 0, max: 23 }),
  body('slots.*.pricePerKwh').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const userId = req.user!.sub;
    const producer = await Producer.findOne({ where: { userId } });
    if (!producer) return res.status(400).json({ error: 'Producer profile not found' });
    const dateStr = dayjs(req.body.date).format('YYYY-MM-DD');
    const slots = req.body.slots as Array<{ hour: number; pricePerKwh: number }>;
    const updated: number[] = [];
    for (const s of slots) {
      const [cap] = await ProducerCapacity.findOrCreate({
        where: { producerId: producer.id, date: dateStr, hour: s.hour },
        defaults: { producerId: producer.id, date: dateStr, hour: s.hour, maxCapacityKwh: 0, pricePerKwh: s.pricePerKwh },
      });
      await cap.update({ pricePerKwh: s.pricePerKwh });
      updated.push(cap.id);
    }
    return res.json({ capacities: updated });
  }
);

// Ricavi totali in un intervallo di date
router.get(
  '/earnings',
  authenticate,
  requireRole(['producer', 'admin']),
  query('range').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const userId = req.user!.sub;
    const producer = await Producer.findOne({ where: { userId } });
    if (!producer) return res.status(400).json({ error: 'Producer profile not found' });
    const [start, end] = String(req.query.range).split('|');
    const startStr = dayjs(start).format('YYYY-MM-DD');
    const endStr = dayjs(end).format('YYYY-MM-DD');
    const reservations = await Reservation.findAll({ where: { producerId: producer.id, status: 'reserved' } });
    const filtered = reservations.filter(r => r.date >= startStr && r.date <= endStr);
    const total = filtered.reduce((sum, r) => sum + Number(r.kwh) * Number(r.unitPrice), 0);
    return res.json({ total: Math.round(total * 10000) / 10000 });
  }
);

// Taglio proporzionale in caso di overbooking: riduce le quantità e rimborsa l'eccesso
router.post(
  '/proportional-accept',
  authenticate,
  requireRole(['producer', 'admin']),
  body('date').isISO8601(),
  body('hour').isInt({ min: 0, max: 23 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const userId = req.user!.sub;
    const producer = await Producer.findOne({ where: { userId } });
    if (!producer) return res.status(400).json({ error: 'Producer profile not found' });
    const dateStr = dayjs(req.body.date).format('YYYY-MM-DD');
    const hour = Number(req.body.hour);
    const cap = await ProducerCapacity.findOne({ where: { producerId: producer.id, date: dateStr, hour } });
    if (!cap) return res.status(400).json({ error: 'No capacity for slot' });
    const reservations = await Reservation.findAll({ where: { producerId: producer.id, date: dateStr, hour, status: 'reserved' } });
    const totalRequested = reservations.reduce((s, r) => s + Number(r.kwh), 0);
    const capacity = Number(cap.maxCapacityKwh);
    if (totalRequested <= capacity) return res.json({ adjusted: false, message: 'No need to adjust' });
    const ratio = capacity / totalRequested;
    for (const r of reservations) {
      const newKwh = Math.round(Number(r.kwh) * ratio * 1000) / 1000;
      if (newKwh < 0.1) continue; // mantieni granularità minima fuori dallo scope
      const diff = Number(r.kwh) - newKwh; // excess to refund
      if (diff > 0) {
        const refund = diff * Number(r.unitPrice);
        const consumer = await User.findByPk(r.consumerId);
        if (consumer) {
          const newCredit = Math.round((Number(consumer.credit) + refund) * 10000) / 10000;
          await consumer.update({ credit: newCredit });
        }
        await r.update({ kwh: newKwh });
      }
    }
    return res.json({ adjusted: true, ratio: Math.round(ratio * 1000) / 1000 });
  }
);


