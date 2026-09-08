import express from 'express';
import webpush from 'web-push';

const app = express();
app.use(express.json({ limit: '100kb' }));

const port = process.env.PORT || 3000;
const publicKey = process.env.VAPID_PUBLIC_KEY || '';
const privateKey = process.env.VAPID_PRIVATE_KEY || '';
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey);

const subscriptions = new Map();

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/vapid-public-key', (_req, res) => {
  if (!publicKey) return res.status(503).json({ error: 'VAPID is not configured.' });
  res.json({ publicKey });
});

app.post('/api/push/subscribe', (req, res) => {
  const { subscription, location, notifications } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription.' });
  const key = subscription.endpoint;
  subscriptions.set(key, { subscription, location, notifications, updatedAt: Date.now() });
  res.json({ ok: true });
});

app.post('/api/push/test', async (req, res) => {
  const { endpoint } = req.body || {};
  const entry = subscriptions.get(endpoint);
  if (!entry) return res.status(404).json({ error: 'Subscription not found.' });
  if (!publicKey || !privateKey) return res.status(503).json({ error: 'VAPID is not configured.' });
  try {
    await webpush.sendNotification(entry.subscription, JSON.stringify({ title: 'Namaz', body: 'Push notifications are working.' }));
    res.json({ ok: true });
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) subscriptions.delete(endpoint);
    res.status(502).json({ error: 'Push delivery failed.' });
  }
});

app.listen(port, () => console.log(`Namaz push server listening on ${port}`));
