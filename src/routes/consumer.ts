import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Producer } from '../models/Producer.js';
import { ProducerCapacity } from '../models/ProducerCapacity.js';
import { Reservation } from '../models/Reservation.js';
import dayjs from 'dayjs';

const router = Router();

// Reserve an hour slot for next day with min 0.1 kWh; one producer per hour per consumer
router.post(
  '/reserve',
  authenticate,
  requireRole(['consumer', 'admin']),
  body('producerId').isInt({ min: 1 }),
  body('date').isISO8601(),
  body('hour').isInt({ min: 0, max: 23 }),
  body('kwh').isFloat({ min: 0.1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const consumerId = req.user!.sub;
    const { producerId } = req.body as { producerId: number };
    const dateStr = dayjs(req.body.date).format('YYYY-MM-DD');
    const hour = Number(req.body.hour);
    const kwh = Number(req.body.kwh);
    // cutoff: reservable until 24h before
    const slotTime = dayjs(`${dateStr} ${String(hour).padStart(2, '0')}:00:00`);
    if (slotTime.diff(dayjs(), 'hour') <= 24) return res.status(400).json({ error: 'Reservation cutoff passed (24h before)' });
    const producer = await Producer.findByPk(producerId);
    if (!producer) return res.status(404).json({ error: 'Producer not found' });
    const cap = await ProducerCapacity.findOne({ where: { producerId, date: dateStr, hour } });
    if (!cap) return res.status(400).json({ error: 'No capacity set for that slot' });
    // ensure not exceeding capacity: sum of existing + new <= max
    const existing = await Reservation.findAll({ where: { producerId, date: dateStr, hour, status: 'reserved' } });
    const existingSum = existing.reduce((s, r) => s + Number(r.kwh), 0);
    if (existingSum + kwh > Number(cap.maxCapacityKwh)) return res.status(400).json({ error: 'Capacity exceeded' });
    // enforce one producer per hour for consumer
    const consumerExisting = await Reservation.findOne({ where: { consumerId, date: dateStr, hour, status: 'reserved' } });
    if (consumerExisting && consumerExisting.producerId !== producerId) return res.status(400).json({ error: 'Only one producer per hour per consumer' });
    // charge credit at reservation
    const unitPrice = Number(cap.pricePerKwh || producer.pricePerKwh);
    const cost = unitPrice * kwh;
    const consumer = await User.findByPk(consumerId);
    if (!consumer) return res.status(400).json({ error: 'Consumer not found' });
    if (Number(consumer.credit) < cost) return res.status(400).json({ error: 'Insufficient credit' });
    const newCreditAfterCharge = Math.round((Number(consumer.credit) - cost) * 10000) / 10000;
    await consumer.update({ credit: newCreditAfterCharge });
    const resv = await Reservation.create({ consumerId, producerId, date: dateStr, hour, kwh, unitPrice, status: 'reserved' });
    return res.status(201).json({ id: resv.id });
  }
);

// Modify reservation (including cancellation by setting kwh=0). Refund if >24h before.
router.post(
  '/modify',
  authenticate,
  requireRole(['consumer', 'admin']),
  body('reservationId').isInt({ min: 1 }),
  body('kwh').isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const consumerId = req.user!.sub;
    const reservation = await Reservation.findByPk(Number(req.body.reservationId));
    if (!reservation || reservation.consumerId !== consumerId) return res.status(404).json({ error: 'Reservation not found' });
    const newKwh = Number(req.body.kwh);
    const slotTime = dayjs(`${reservation.date} ${String(reservation.hour).padStart(2, '0')}:00:00`);
    const consumer = await User.findByPk(consumerId);
    if (!consumer) return res.status(400).json({ error: 'Consumer not found' });
    if (newKwh === 0) {
      // cancel
      const refundAllowed = slotTime.diff(dayjs(), 'hour') > 24;
      if (refundAllowed) {
        const refund = Number(reservation.unitPrice) * Number(reservation.kwh);
        const newCreditAfterRefund = Math.round((Number(consumer.credit) + refund) * 10000) / 10000;
        await consumer.update({ credit: newCreditAfterRefund });
      }
      await reservation.update({ status: 'cancelled', kwh: 0 });
      return res.json({ cancelled: true, refunded: slotTime.diff(dayjs(), 'hour') > 24 });
    }
    if (newKwh < 0.1) return res.status(400).json({ error: 'Minimum 0.1 kWh' });
    // adjust capacity usage
    const producerId = reservation.producerId;
    const cap = await ProducerCapacity.findOne({ where: { producerId, date: reservation.date, hour: reservation.hour } });
    if (!cap) return res.status(400).json({ error: 'No capacity for slot' });
    const existing = await Reservation.findAll({ where: { producerId, date: reservation.date, hour: reservation.hour, status: 'reserved' } });
    const othersSum = existing.filter(r => r.id !== reservation.id).reduce((s, r) => s + Number(r.kwh), 0);
    if (othersSum + newKwh > Number(cap.maxCapacityKwh)) return res.status(400).json({ error: 'Capacity exceeded' });
    // adjust credit (charge or refund difference) if price kept constant at unitPrice locked
    const diffKwh = newKwh - Number(reservation.kwh);
    const diffCost = diffKwh * Number(reservation.unitPrice);
    const newCredit = Math.round((Number(consumer.credit) - diffCost) * 10000) / 10000;
    await consumer.update({ credit: newCredit });
    await reservation.update({ kwh: newKwh });
    return res.json({ id: reservation.id, kwh: reservation.kwh });
  }
);

// List purchases with filters
router.get(
  '/purchases',
  authenticate,
  requireRole(['consumer', 'admin']),
  query('producerId').optional().isInt({ min: 1 }),
  query('energyType').optional().isIn(['Fossile', 'Eolico', 'Fotovoltaico']),
  query('range').optional().isString(),
  async (req, res) => {
    const consumerId = req.user!.sub;
    const where: any = { consumerId, status: 'reserved' };
    if (req.query.producerId) where.producerId = Number(req.query.producerId);
    if (req.query.range) {
      const [start, end] = String(req.query.range).split('|');
      where.date = {};
      where.date['$between'] = [dayjs(start).format('YYYY-MM-DD'), dayjs(end).format('YYYY-MM-DD')];
    }
    const reservations = await Reservation.findAll({ where, include: [{ model: Producer, as: 'producer' }] });
    let filtered = reservations;
    if (req.query.energyType) {
      filtered = reservations.filter(r => (r as any).producer?.energyType === req.query.energyType);
    }
    return res.json(filtered);
  }
);

// Carbon footprint in a time interval
router.get(
  '/carbon',
  authenticate,
  requireRole(['consumer', 'admin']),
  query('range').isString(),
  async (req, res) => {
    const consumerId = req.user!.sub;
    const [start, end] = String(req.query.range).split('|');
    const startStr = dayjs(start).format('YYYY-MM-DD');
    const endStr = dayjs(end).format('YYYY-MM-DD');
    const reservations = await Reservation.findAll({
      where: { consumerId, status: 'reserved' },
      include: [{ model: Producer, as: 'producer' }],
    });
    const filtered = reservations.filter(r => r.date >= startStr && r.date <= endStr);
    const totalGrams = filtered.reduce((sum, r) => sum + Number(r.kwh) * Number((r as any).producer?.co2PerKwh ?? 0), 0);
    return res.json({ gramsCO2: Math.round(totalGrams * 1000) / 1000 });
  }
);

export default router;


