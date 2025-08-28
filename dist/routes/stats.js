import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth.js';
import { Producer } from '../models/Producer.js';
import { ProducerCapacity } from '../models/ProducerCapacity.js';
import { Reservation } from '../models/Reservation.js';
import dayjs from 'dayjs';
import puppeteer from 'puppeteer';
const router = Router();
// Stats per hour: min%, max%, avg%, stddev% over a date range
router.get('/producer', authenticate, requireRole(['producer', 'admin']), query('range').isString(), query('format').optional().isIn(['json', 'image']), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });
    const userId = req.user.sub;
    const producer = await Producer.findOne({ where: { userId } });
    if (!producer)
        return res.status(400).json({ error: 'Producer profile not found' });
    const [start, end] = String(req.query.range).split('|');
    const startStr = dayjs(start).format('YYYY-MM-DD');
    const endStr = dayjs(end).format('YYYY-MM-DD');
    const capacities = await ProducerCapacity.findAll({ where: { producerId: producer.id } });
    const reservations = await Reservation.findAll({ where: { producerId: producer.id, status: 'reserved' } });
    const hours = Array.from({ length: 24 }).map((_, i) => i);
    const stats = hours.map((hour) => {
        const days = new Set();
        const pct = [];
        for (const cap of capacities) {
            if (cap.hour !== hour)
                continue;
            if (cap.date < startStr || cap.date > endStr)
                continue;
            days.add(cap.date);
            const capKwh = Number(cap.maxCapacityKwh);
            const resKwh = reservations
                .filter(r => r.hour === hour && r.date === cap.date)
                .reduce((s, r) => s + Number(r.kwh), 0);
            pct.push(capKwh === 0 ? 0 : Math.min(100, (resKwh / capKwh) * 100));
        }
        const min = pct.length ? Math.min(...pct) : 0;
        const max = pct.length ? Math.max(...pct) : 0;
        const avg = pct.length ? pct.reduce((a, b) => a + b, 0) / pct.length : 0;
        const std = pct.length ? Math.sqrt(pct.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / pct.length) : 0;
        return { hour, min, max, avg, std };
    });
    const format = req.query.format || 'json';
    if (format === 'image') {
        try {
            // Render a simple Plotly chart using headless Chrome and return PNG
            const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
            const page = await browser.newPage();
            const html = `<!doctype html><html><head><meta charset=\"utf-8\" />
          <script src=\"https://cdn.plot.ly/plotly-2.32.0.min.js\"></script></head>
          <body><div id=\"chart\" style=\"width:1000px;height:600px;\"></div>
          <script>
            const stats = ${JSON.stringify(stats)};
            const x = stats.map(s => s.hour);
            const avg = stats.map(s => s.avg);
            const data = [{ x, y: avg, type: 'scatter', name: 'Avg %' }];
            const layout = { title: 'Average % Energy Sold', xaxis:{title:'Hour'}, yaxis:{title:'% sold', range:[0,100]} };
            Plotly.newPlot('chart', data, layout).then(() => {
              window.setTimeout(() => window.resolveReady && window.resolveReady(), 50);
            });
          </script></body></html>`;
            await page.setContent(html, { waitUntil: 'networkidle0' });
            await page.exposeFunction('resolveReady', () => { });
            await page.waitForFunction('document.getElementById("chart").children.length > 0', { timeout: 5000 });
            const chart = await page.$('#chart');
            const buffer = await chart.screenshot({ type: 'png' });
            await browser.close();
            res.setHeader('Content-Type', 'image/png');
            return res.send(buffer);
        }
        catch (e) {
            return res.json({ note: 'Impossibile generare immagine in questo ambiente; restituiti dati JSON', stats });
        }
    }
    return res.json(stats);
});
export default router;
