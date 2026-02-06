import 'dotenv/config';
import express from 'express';
import { json } from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import attendanceRoutes from './routes/attendance.routes';
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employees.routes';
import departmentRoutes from './routes/department.routes';
import leaveRoutes from './routes/leave.routes';

const app = express();

app.use(json());
app.use(cookieParser());
app.use(cors({
    origin: (origin, callback) => {
        // 允许任何来源以便于局域网调试，同时支持 credentials
        callback(null, true);
    },
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
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leave', leaveRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
