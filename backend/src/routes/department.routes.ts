import { Router } from 'express';
import prisma from '../db';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            where: { deletedAt: null },
            orderBy: { name: 'asc' }
        });
        res.json({ success: true, data: departments });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
