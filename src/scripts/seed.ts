import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from '../shared/db.js';
import { User } from '../models/User.js';
import { Producer } from '../models/Producer.js';
import bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { ProducerCapacity } from '../models/ProducerCapacity.js';

async function main() {
  await sequelize.sync({ force: true });
  const admin = await User.create({ email: 'admin@example.com', name: 'Admin', role: 'admin', passwordHash: await bcrypt.hash('admin123', 10), credit: 0 });
  const prodUser = await User.create({ email: 'producer@example.com', name: 'Producer One', role: 'producer', passwordHash: await bcrypt.hash('prod12345', 10), credit: 0 });
  const consUser = await User.create({ email: 'consumer@example.com', name: 'Consumer One', role: 'consumer', passwordHash: await bcrypt.hash('cons12345', 10), credit: 2000 });
  const producer = await Producer.create({ userId: prodUser.id, energyType: 'Fotovoltaico', co2PerKwh: 45.0, pricePerKwh: 0.25, defaultMaxPerHourKwh: 60 });
  // capacities for tomorrow, hours 8-20
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  for (let h = 8; h <= 20; h++) {
    const max = h >= 10 && h <= 16 ? 50 : 30; // more capacity at midday
    const price = h >= 10 && h <= 16 ? 0.22 : 0.28;
    await ProducerCapacity.create({ producerId: producer.id, date: tomorrow, hour: h, maxCapacityKwh: max, pricePerKwh: price });
  }
  // eslint-disable-next-line no-console
  console.log('Seed completed', { admin: admin.id, producer: prodUser.id, consumer: consUser.id });
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


