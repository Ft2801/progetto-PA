import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Producer } from '../models/Producer.js';
import { ProducerCapacity } from '../models/ProducerCapacity.js';
import { Reservation } from '../models/Reservation.js';
import dayjs from 'dayjs';
import puppeteer from 'puppeteer';

// Statistiche orarie per produttore; opzionalmente restituisce immagine PNG
export async function producerStats(req: Request, res: Response) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const userId = req.user!.sub;
  const producer = await Producer.findOne({ where: { userId } });
  if (!producer) return res.status(400).json({ error: 'Producer profile not found' });
  const [start, end] = String(req.query.range).split('|');
  const startStr = dayjs(start).format('YYYY-MM-DD');
  const endStr = dayjs(end).format('YYYY-MM-DD');
  const capacities = await ProducerCapacity.findAll({ where: { producerId: producer.id } });
  const reservations = await Reservation.findAll({ where: { producerId: producer.id, status: 'reserved' } });
  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const stats = hours.map((hour) => {
    const pct: number[] = [];
    for (const cap of capacities) {
      if (cap.hour !== hour) continue;
      if (cap.date < startStr || cap.date > endStr) continue;
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
  const format = (req.query.format as string) || 'json';
  if (format === 'image') {
    try {
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
      await page.exposeFunction('resolveReady', () => {});
      await page.waitForFunction('document.getElementById("chart").children.length > 0', { timeout: 5000 });
      const chart = await page.$('#chart');
      const buffer = await chart!.screenshot({ type: 'png' });
      await browser.close();
      res.setHeader('Content-Type', 'image/png');
      return res.send(buffer);
    } catch (e) {
      return res.json({ note: 'Impossibile generare immagine in questo ambiente; restituiti dati JSON', stats });
    }
  }
  if (format === 'html') {
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <title>Producer Stats</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
      <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:16px;}#chart{width:100%;max-width:1000px;height:600px;margin:auto;}h1{font-size:20px;text-align:center;margin:8px 0 16px}</style>
    </head>
      <body>
        <h1>Average % Energy Sold per Hour</h1>
        <div id="chart"></div>
        <script>
          const stats = ${JSON.stringify(stats)};
          const x = stats.map(s => s.hour);
          const avg = stats.map(s => Math.round(s.avg*100)/100);
          const min = stats.map(s => Math.round(s.min*100)/100);
          const max = stats.map(s => Math.round(s.max*100)/100);
          const std = stats.map(s => Math.round(s.std*100)/100);
          const data = [
            { x, y: avg, type: 'scatter', name: 'Avg %' },
            { x, y: min, type: 'scatter', name: 'Min %' },
            { x, y: max, type: 'scatter', name: 'Max %' }
          ];
          const layout = { title: 'Average % Energy Sold', xaxis:{title:'Hour'}, yaxis:{title:'% sold', range:[0,100]} };
          Plotly.newPlot('chart', data, layout);
        </script>
      </body>
    </html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }
  return res.json(stats);
}


