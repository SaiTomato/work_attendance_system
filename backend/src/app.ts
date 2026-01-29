
import express from 'express';
import { json } from 'body-parser';
import cors from 'cors'; // Assuming we'd install this in real env
import attendanceRoutes from './routes/attendance.routes';

const app = express();

app.use(json());
// app.use(cors()); // Enable CORS

// Routes
app.use('/attendance', attendanceRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
