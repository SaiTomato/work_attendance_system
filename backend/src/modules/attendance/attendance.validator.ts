import { body } from 'express-validator';

export const createAttendanceValidator = [
    body('employeeId').isString().notEmpty().withMessage('社員IDは必須です'),
    body('date').isISO8601().withMessage('有効な日付を入力してください'),
    body('status').isIn(['present', 'late', 'absent', 'leave', 'business_trip']).withMessage('不正なステータスです'),
    body('source').isString().notEmpty().withMessage('入力元は必須です'),
];

export const updateAttendanceValidator = [
    body('status').isIn(['present', 'late', 'absent', 'leave', 'business_trip']).withMessage('不正なステータスです'),
    body('reason').isString().notEmpty().withMessage('監査ログのため修正理由は必須です'),
];
