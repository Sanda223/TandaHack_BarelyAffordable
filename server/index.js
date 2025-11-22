import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ dest: path.join(os.tmpdir(), 'statement_uploads') });
const app = express();

app.use(cors({ origin: true }));

app.post('/api/analyze', upload.array('files', 3), async (req, res) => {
  const files = (req.files || []).map((f) => f.path).filter(Boolean);
  if (!files.length) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const employer = req.body?.employer || '';
  const scriptPath = path.join(__dirname, '..', 'scripts', 'statement_analyzer.py');
  const args = [scriptPath, ...files];
  if (employer) {
    args.push('--employer', employer);
  }

  const python = spawn('python', args);
  let stdout = '';
  let stderr = '';

  python.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  python.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  python.on('close', async (code) => {
    await Promise.all(files.map((f) => fs.unlink(f).catch(() => {})));

    if (code !== 0) {
      return res.status(500).json({
        error: 'Statement analysis failed',
        details: stderr.trim() || `Process exited with code ${code}`,
      });
    }

    try {
      const parsed = JSON.parse(stdout);
      return res.json(parsed);
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to parse analyzer output',
        details: err instanceof Error ? err.message : String(err),
        raw: stdout.slice(0, 1000),
      });
    }
  });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Analyzer API listening on http://localhost:${port}`);
});
