
import { body } from 'express-validator';

export const createAttendanceValidator = [
    body('employeeId').isString().notEmpty().withMessage('Employee ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('status').isIn(['present', 'late', 'absent', 'leave', 'business_trip']).withMessage('Invalid status'),
    body('source').isString().notEmpty().withMessage('Source is required'),
];

export const updateAttendanceValidator = [
    body('status').isIn(['present', 'late', 'absent', 'leave', 'business_trip']).withMessage('Invalid status'),
    body('reason').isString().notEmpty().withMessage('Reason is required for audit'),
];
