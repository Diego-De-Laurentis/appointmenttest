import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { nanoid } from 'nanoid';
import { getDb } from './db.js';
import { sendMail } from './mailer.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Utilities
function fmt(dtIso) {
  const d = new Date(dtIso);
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function inferredBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'http').toString();
  const host = req.headers.host;
  return `${proto}://${host}`;
}

// API: list available slots
app.get('/api/slots', async (_req, res) => {
  const db = await getDb();
  const rows = await db.all('SELECT id, start_iso, end_iso FROM slots WHERE is_booked = 0 AND datetime(start_iso) > datetime("now") ORDER BY start_iso ASC');
  res.json(rows);
});

// API: create appointment (pending confirmation)
app.post('/api/appointments', async (req, res) => {
  const { slotId, name, email, phone, termsAccepted } = req.body;
  if (!slotId || !name || !email || !termsAccepted) return res.status(400).json({ error: 'Missing required fields' });
  const db = await getDb();
  // Ensure slot exists and not booked
  const slot = await db.get('SELECT * FROM slots WHERE id = ? AND is_booked = 0', [slotId]);
  if (!slot) return res.status(409).json({ error: 'Slot not available' });

  const tokenCustomer = nanoid(32);
  const tokenProvider = nanoid(32);

  const result = await db.run(
    `INSERT INTO appointments (slot_id, customer_name, customer_email, customer_phone, terms_accepted, token_customer, token_provider)
     VALUES (?,?,?,?,?,?,?)`,
    [slotId, name, email, phone || '', termsAccepted ? 1 : 0, tokenCustomer, tokenProvider]
  );

  const apptId = result.lastID;
  const base = inferredBaseUrl(req);
  const custLink = `${base}/confirm?token=${tokenCustomer}&who=customer`;
  const provLink = `${base}/confirm?token=${tokenProvider}&who=provider`;

  // Email customer
  await sendMail({
    to: email,
    subject: `Confirm your appointment ${fmt(slot.start_iso)}`,
    html: `<p>Hello ${name},</p>
<p>Please confirm your appointment for <strong>${fmt(slot.start_iso)}</strong>.</p>
<p><a href="${custLink}">Confirm appointment</a></p>
<p>If you did not request this, ignore this email.</p>`
  });

  // Email provider
  await sendMail({
    to: process.env.PROVIDER_EMAIL,
    subject: `New appointment request ${fmt(slot.start_iso)}`,
    html: `<p>Request from ${name} (${email}${phone ? ', ' + phone : ''}) for <strong>${fmt(slot.start_iso)}</strong>.</p>
<p><a href="${provLink}">Confirm as provider</a></p>`
  });

  res.json({ ok: true, appointmentId: apptId });
});

// Confirmation endpoint (clicked from email)
app.get('/confirm', async (req, res) => {
  const { token, who } = req.query;
  if (!token || !['customer','provider'].includes(String(who))) return res.status(400).send('Invalid link');
  const db = await getDb();
  const col = who === 'customer' ? 'customer_confirmed' : 'provider_confirmed';
  const tokenCol = who === 'customer' ? 'token_customer' : 'token_provider';

  const appt = await db.get(`SELECT a.*, s.start_iso FROM appointments a JOIN slots s ON s.id = a.slot_id WHERE ${tokenCol} = ?`, [token]);
  if (!appt) return res.status(404).send('Token not found');

  if (appt[col]) {
    return res.send('Already confirmed.');
  }

  await db.run(`UPDATE appointments SET ${col} = 1 WHERE id = ?`, [appt.id]);

  // If both confirmed, mark slot booked and send final notices
  const updated = await db.get('SELECT * FROM appointments WHERE id = ?', [appt.id]);
  if (updated.customer_confirmed && updated.provider_confirmed) {
    // Atomically mark slot booked if still free
    const result = await db.run('UPDATE slots SET is_booked = 1 WHERE id = ? AND is_booked = 0', [updated.slot_id]);
    if (result.changes === 1) {
      // Send final confirmations
      await sendMail({
        to: updated.customer_email,
        subject: 'Appointment confirmed',
        html: `<p>Your appointment for <strong>${fmt(appt.start_iso)}</strong> is confirmed.</p>`
      });
      await sendMail({
        to: process.env.PROVIDER_EMAIL,
        subject: 'Appointment confirmed',
        html: `<p>Confirmed appointment with ${updated.customer_name} for <strong>${fmt(appt.start_iso)}</strong>.</p>`
      });
    }
  }

  res.send('Confirmation saved. You can close this page.');
});

// Lightweight health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server at http://0.0.0.0:${PORT}`);
});
