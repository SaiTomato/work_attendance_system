import { PrismaClient, Position, EmployeeStatus, WorkLocation, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 正在执行全量改革：灌入 PROJECT_REFORM 拟真数据...');

    // --- 清理旧数据 ---
    await prisma.attendance.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.attendanceRule.deleteMany({});

    // --- 1. 创建部门 ---
    const depts = {
        tech: await prisma.department.create({ data: { name: '技术部', code: 'TECH', description: 'Software and Infrastructure' } }),
        finance: await prisma.department.create({ data: { name: '财务部', code: 'FIN' } }),
        gen: await prisma.department.create({ data: { name: '总务部', code: 'GEN' } }),
    };

    // --- 2. 创建考勤规则 (基于 PROJECT_REFORM) ---
    await prisma.attendanceRule.create({
        data: {
            name: '公司标准工时规则',
            standardCheckIn: '09:00',
            standardCheckOut: '18:00',
            windowStart: '07:00',
            windowEnd: '14:00',
            autoCheckoutTime: '20:00',
            isDefault: true
        }
    });

    // --- 3. 创建员工档案 ---
    const employees = [
        { id: 'EMP-001', name: '佐藤 健一', gender: 'Male', age: 34, phone: '090-1111-2222', email: 'sato@example.com', position: Position.MANAGER, status: EmployeeStatus.ACTIVE, dept: depts.tech },
        { id: 'EMP-002', name: '田中 美香', gender: 'Female', age: 28, phone: '090-2222-3333', email: 'tanaka@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.tech },
        { id: 'EMP-003', name: '鈴木 一郎', gender: 'Male', age: 45, phone: '090-3333-4444', email: 'suzuki@example.com', position: Position.SUB_MANAGER, status: EmployeeStatus.ACTIVE, dept: depts.finance },
        { id: 'EMP-004', name: '高橋 瞳', gender: 'Female', age: 24, phone: '090-4444-5555', email: 'takahashi@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.finance },
        { id: 'EMP-005', name: '伊藤 博文', gender: 'Male', age: 50, phone: '090-5555-6666', email: 'ito@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.gen },
        { id: 'EMP-006', name: '渡辺 麻衣', gender: 'Female', age: 29, phone: '090-6666-7777', email: 'watanabe@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.tech },
        { id: 'EMP-007', name: '中村 剛', gender: 'Male', age: 38, phone: '090-7777-8888', email: 'nakamura@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.tech },
        { id: 'EMP-008', name: '小林 誠', gender: 'Male', age: 41, phone: '090-8888-9999', email: 'kobayashi@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.finance },
        { id: 'EMP-009', name: '加藤 あい', gender: 'Female', age: 31, phone: '090-9999-0000', email: 'kato@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.gen },
        { id: 'EMP-010', name: '吉田 拓郎', gender: 'Male', age: 27, phone: '080-1234-5678', email: 'yoshida@example.com', position: Position.STAFF, status: EmployeeStatus.ACTIVE, dept: depts.tech },
    ];

    const createdEmployees = [];
    for (const emp of employees) {
        const e = await prisma.employee.create({
            data: {
                employeeId: emp.id,
                name: emp.name,
                gender: emp.gender,
                age: emp.age,
                phone: emp.phone,
                email: emp.email,
                position: emp.position,
                status: emp.status,
                departmentId: emp.dept.id,
                workLocation: WorkLocation.OFFICE,
                hireDate: new Date('2024-01-01')
            }
        });
        createdEmployees.push(e);
    }

    // --- 4. 创建账号体系 ---
    const hashedPass = await bcrypt.hash('pass123', 10);
    const adminPass = await bcrypt.hash('admin123', 10);

    // 管理员 (无员工绑定)
    await prisma.user.create({ data: { username: 'admin', password: adminPass, role: UserRole.admin } });

    // 终端 (无员工绑定)
    await prisma.user.create({ data: { username: 'scanner_01', password: await bcrypt.hash('scan123', 10), role: UserRole.terminal } });

    // 员工账号 (绑定 ID)
    await prisma.user.create({ data: { username: 'sato_emp', password: hashedPass, role: UserRole.viewer, employeeId: 'EMP-001' } });
    await prisma.user.create({ data: { username: 'tanaka_emp', password: hashedPass, role: UserRole.viewer, employeeId: 'EMP-002' } });

    // --- 5. 初始出勤状态测试数据 (PROJECT_REFORM) ---
    const today = new Date();
    const today0700 = new Date(new Date(today).setHours(7, 0, 0, 0));

    // 全员 07:00 初始化
    for (const emp of createdEmployees) {
        await prisma.attendance.create({
            data: {
                employeeId: emp.employeeId,
                status: '未出勤-正常',
                recorder: 'SYSTEM',
                recordTime: today0700
            }
        });
    }

    // 模拟一些打卡数据 (EMP-001 正常, EMP-002 迟到, EMP-003 请假, EMP-004 外出)
    await prisma.attendance.create({
        data: {
            employeeId: 'EMP-001',
            status: '出勤-正常',
            recorder: 'QR_SCANNER',
            recordTime: new Date(new Date(today).setHours(8, 45, 0, 0))
        }
    });

    await prisma.attendance.create({
        data: {
            employeeId: 'EMP-001',
            status: '退勤-正常',
            recorder: 'QR_SCANNER',
            recordTime: new Date(new Date(today).setHours(18, 5, 0, 0))
        }
    });

    await prisma.attendance.create({
        data: {
            employeeId: 'EMP-002',
            status: '出勤-迟到',
            recorder: 'QR_SCANNER',
            recordTime: new Date(new Date(today).setHours(10, 30, 0, 0))
        }
    });

    await prisma.attendance.create({
        data: {
            employeeId: 'EMP-003',
            status: '休假-有休',
            recorder: 'ADMIN',
            reason: '年次休暇',
            recordTime: new Date(new Date(today).setHours(9, 0, 0, 0))
        }
    });

    await prisma.attendance.create({
        data: {
            employeeId: 'EMP-004',
            status: '公司外-现场',
            recorder: 'ADMIN',
            recordTime: new Date(new Date(today).setHours(9, 15, 0, 0))
        }
    });

    console.log('\n✨ PROJECT_REFORM 数据重组完成！');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
