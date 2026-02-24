import 'dotenv/config';
import app from './app';
import { initScheduler } from './services/scheduler';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    // 启动考勤自动调度器
    initScheduler();
});

