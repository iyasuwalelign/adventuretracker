const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load .env variables if present
try { require('dotenv').config(); } catch(e) { /* dotenv optional */ }
const app = express();
const port = process.env.PORT || 3000;

// Ensure `fetch` is available on older Node versions by falling back to node-fetch
let fetchFn = globalThis.fetch;
try {
  if (!fetchFn) fetchFn = require('node-fetch');
} catch (e) {
  // node-fetch not installed; fetchFn may remain undefined for very old Node versions
}

const imagesDir = path.join(__dirname, 'images');
if(!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, imagesDir); },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1e9);
    const ext = path.extname(file.originalname) || '.png';
    cb(null, unique + ext);
  }
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Serve static files and use `hi.html` as the index for `/`
app.use(express.static(__dirname, { index: 'hi.html' }));
app.use(express.json({ limit: '20mb' }));

const dataDir = path.join(__dirname, 'data');
if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const libFile = path.join(dataDir, 'library.json');
const journalFile = path.join(dataDir, 'journal.json');

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8') || 'null') || []; } catch(e) { return []; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

app.get('/api/library', (req, res) => {
  res.json(readJSON(libFile));
});

app.post('/api/library', (req, res) => {
  const items = readJSON(libFile);
  const item = req.body;
  item.id = item.id || Date.now();
  items.push(item);
  writeJSON(libFile, items);
  res.json(item);
});

app.put('/api/library/:id', (req, res) => {
  const id = Number(req.params.id);
  const items = readJSON(libFile);
  const idx = items.findIndex(i => i.id === id);
  if(idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  writeJSON(libFile, items);
  res.json(items[idx]);
});

app.delete('/api/library/:id', (req, res) => {
  const id = Number(req.params.id);
  let items = readJSON(libFile);
  items = items.filter(i => i.id !== id);
  writeJSON(libFile, items);
  res.json({ ok: true });
});

app.get('/api/journal', (req, res) => {
  res.json(readJSON(journalFile));
});

app.post('/api/journal', (req, res) => {
  const items = readJSON(journalFile);
  const item = req.body;
  item.id = item.id || Date.now();
  items.push(item);
  writeJSON(journalFile, items);
  res.json(item);
});

app.put('/api/journal/:id', (req, res) => {   
  const id = Number(req.params.id);
  const items = readJSON(journalFile);
  const idx = items.findIndex(i => i.id === id);
  if(idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body };
  writeJSON(journalFile, items);
  res.json(items[idx]);
});

app.delete('/api/journal/:id', (req, res) => {
  const id = Number(req.params.id);
  let items = readJSON(journalFile);
  items = items.filter(i => i.id !== id);
  writeJSON(journalFile, items);
  res.json({ ok: true });
});

app.get('/api/ping', (req, res) => res.json({ ok: true }));

// Return list of files in images/ for gallery viewing
app.get('/api/images', (req, res) => {
  try {
    const items = fs.readdirSync(imagesDir).filter(f => {
      const lower = f.toLowerCase();
      return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
    }).map(fn => ({ name: fn, url: '/images/' + fn }));
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: 'failed' });
  }
});

// YouTube search proxy (requires YT_API_KEY environment variable)
app.get('/api/search-youtube', async (req, res) => {
  const q = req.query.q;
  const key = process.env.YT_API_KEY;
  if(!q) return res.status(400).json({ error: 'Missing query (q)' });
  if(!key) return res.status(400).json({ error: 'Missing YT_API_KEY on server. See README to add one.' });
  try {
    if(!fetchFn) return res.status(500).json({ error: 'Server missing fetch implementation' });
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(q)}&key=${encodeURIComponent(key)}`;
    const r = await fetchFn(apiUrl);
    if(!r.ok) {
      const text = await r.text().catch(()=>null);
      console.error('YouTube API returned error', r.status, text);
      return res.status(502).json({ error: 'YouTube API error', status: r.status, body: text });
    }
    const data = await r.json();
    const items = (data.items||[]).map(it => ({
      id: it.id.videoId,
      title: it.snippet.title,
      channel: it.snippet.channelTitle,
      thumbnail: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url
    }));
    res.json(items);
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

app.post('/upload', upload.single('image'), (req, res) => {
  if(!req.file) return res.status(400).json({ error: 'No file' });
  const urlPath = '/images/' + path.basename(req.file.path);
  res.json({ url: urlPath });
});

const server = app.listen(port, () => console.log(`Local image server running on http://localhost:${port}`));
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the process using that port and restart the server.`);
  } else {
    console.error('Server error:', err);
  }
});
