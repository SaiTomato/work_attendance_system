
import express from 'express';
import { json } from 'body-parser';
import cors from 'cors'; // Assuming we'd install this in real env
import attendanceRoutes from './routes/attendance.routes';

const app = express();

app.use(json());
app.use(cors()); // Enable CORS

// Simple Request Logger
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
});

// Routes - match what frontend expects
app.use('/api/attendance', attendanceRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
