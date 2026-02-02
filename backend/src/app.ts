
import express from 'express';
import { json } from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import attendanceRoutes from './routes/attendance.routes';
import authRoutes from './routes/auth.routes';

const app = express();

app.use(json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173', // Vite default
    credentials: true
}));

// Simple Request Logger
app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
});

// Routes - match what frontend expects
app.use('/api/attendance', attendanceRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
