import { getDb, DB_PATH } from './db.js';

const SLOTS_PER_DAY = ['09:00', '11:00', '14:00', '16:00'];

function iso(date, time) {
  const d = new Date(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function addMinutes(isoStr, minutes) {
  return new Date(new Date(isoStr).getTime() + minutes * 60000).toISOString();
}

const run = async () => {
  try {
    console.log('Seeding DB at', DB_PATH);
    const db = await getDb();
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i = 0; i < 14; i++) {
      const day = new Date(today.getTime() + i * 86400000);
      const dayStr = day.toISOString().slice(0,10);
      for (const t of SLOTS_PER_DAY) {
        const start = iso(dayStr, t);
        const end = addMinutes(start, 60);
        try {
          await db.run('INSERT INTO slots(start_iso,end_iso) VALUES (?,?)', [start, end]);
        } catch {}
      }
    }
    const count = await db.get('SELECT COUNT(*) as c FROM slots');
    console.log('Seed complete. slots=', count.c);
  } catch (e) {
    console.error('Seed error:', e);
  } finally {
    process.exit(0);
  }
};
run();
