import { Router, Request, Response } from 'express';
import { employeeService } from '../modules/employees/employees.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// 所有员工管理功能均需认证
router.use(authenticate);

// 1. 获取员工列表 (Admin/HR/Manager 可看)
router.get('/', requireRole(['admin', 'hr', 'manager']), async (req, res) => {
    try {
        const filters = {
            departmentId: req.query.departmentId as string,
            status: req.query.status as string,
            search: req.query.search as string
        };
        const list = await employeeService.listEmployees(filters);
        res.json({ success: true, data: list });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. 创建新员工 (仅限 Admin/HR)
router.post('/', requireRole(['admin', 'hr']), async (req, res) => {
    try {
        const operator = (req as any).user?.username || 'UNKNOWN';
        const newEmp = await employeeService.createEmployee(req.body, operator);
        res.status(201).json({ success: true, data: newEmp });
    } catch (error: any) {
        console.error('Error creating employee:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. 修改员工资料 (仅限 Admin/HR)
router.put('/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
        const operator = (req as any).user?.username || 'UNKNOWN';
        const updated = await employeeService.updateEmployee(req.params.id, req.body, operator);
        res.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Error updating employee:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. 特批考勤规则
router.post('/:id/assign-rule', requireRole(['admin', 'hr']), async (req, res) => {
    try {
        const { ruleId } = req.body;
        await employeeService.assignSpecialRule(req.params.id, ruleId);
        res.json({ success: true, message: 'Rule assigned successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 5. 删除员工 (仅限 Admin/HR)
router.delete('/:id', requireRole(['admin', 'hr']), async (req, res) => {
    try {
        const operator = (req as any).user?.username || 'UNKNOWN';
        await employeeService.deleteEmployee(req.params.id, operator);
        res.json({ success: true, message: 'Employee deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting employee:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
