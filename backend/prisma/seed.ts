import { PrismaClient, Position, EmployeeStatus, WorkLocation, ApprovalStatus, LeaveType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 正在执行全量基建重组 & 灌入拟真测试数据...');

    // --- 清理旧数据 ---
    await prisma.auditLog.deleteMany({});
    await (prisma as any).leaveRequest.deleteMany({});
    await prisma.attendance.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.department.deleteMany({});
    await (prisma as any).holiday.deleteMany({});
    await prisma.attendanceRule.deleteMany({});

    // --- 1. 创建部门 ---
    const depts = {
        tech: await prisma.department.create({ data: { name: '技术部', code: 'TECH', description: 'Software and Infrastructure' } }),
        hr: await prisma.department.create({ data: { name: '人事部', code: 'HR' } }),
        sales: await prisma.department.create({ data: { name: '销售部', code: 'SALES' } }),
        gen: await prisma.department.create({ data: { name: '总务部', code: 'GEN' } }),
    };

    // --- 2. 创建拟真账号体系 ---
    console.log('  - [2/6] 生成分权账号体系 (Admin, Staff, Terminal)...');
    const hashedPass = await bcrypt.hash('pass123', 10);
    const adminPass = await bcrypt.hash('admin123', 10);

    const users = {
        admin: await prisma.user.create({ data: { username: 'admin', password: adminPass, role: 'admin' } }),
        manager: await prisma.user.create({ data: { username: 'chief_mgr', password: adminPass, role: 'manager', departmentId: depts.gen.id } }),
        terminal: await prisma.user.create({ data: { username: 'scanner_01', password: await bcrypt.hash('scan_secret_123', 10), role: 'terminal' as any } }),

        alice: await prisma.user.create({ data: { username: 'alice_emp', password: hashedPass, role: 'viewer', departmentId: depts.hr.id } }),
        bob: await prisma.user.create({ data: { username: 'bob_emp', password: hashedPass, role: 'viewer', departmentId: depts.tech.id } }),
        charlie: await prisma.user.create({ data: { username: 'charlie_emp', password: hashedPass, role: 'viewer', departmentId: depts.sales.id } }),
    };

    // --- 3. 员工档案绑定 ---
    const employees = {
        ceo: await prisma.employee.create({
            data: {
                employeeId: 'EMP-000',
                name: 'トマト太郎',
                position: Position.CEO,
                status: EmployeeStatus.ACTIVE,
                hireDate: new Date('2020-01-01'),
                departmentId: depts.gen.id,
                userId: users.manager.id
            }
        }),
        alice: await prisma.employee.create({
            data: {
                employeeId: 'ALICE-001',
                name: 'Alice Chang',
                position: Position.STAFF,
                status: EmployeeStatus.ACTIVE,
                hireDate: new Date('2020-01-10'),
                departmentId: depts.hr.id,
                userId: users.alice.id
            }
        }),
        bob: await prisma.employee.create({
            data: {
                employeeId: 'EMP-002',
                name: 'Bob Wang',
                position: Position.STAFF,
                status: EmployeeStatus.ACTIVE,
                hireDate: new Date('2020-01-11'),
                departmentId: depts.tech.id,
                userId: users.bob.id
            }
        }),
        charlie: await prisma.employee.create({
            data: {
                employeeId: 'EMP-003',
                name: 'Charlie Li',
                position: Position.STAFF,
                status: EmployeeStatus.ACTIVE,
                hireDate: new Date('2020-01-12'),
                departmentId: depts.hr.id,
                userId: users.charlie.id
            }
        }),
    };

    // --- 4. 节假日 ---
    await (prisma as any).holiday.createMany({
        data: [
            { date: '2026-02-11', name: '建国纪念日' },
            { date: '2026-02-23', name: '天皇诞生日' },
        ]
    });

    await prisma.attendanceRule.create({
        data: {
            name: '默认标准上班规则',
            standardCheckIn: '10:00',
            standardCheckOut: '17:00',
            isDefault: true
        }
    });

    // --- 5. 请假单 ---
    await (prisma as any).leaveRequest.createMany({
        data: [
            {
                employeeId: 'EMP-003',
                type: LeaveType.ANNUAL,
                startDate: new Date('2026-02-01'),
                endDate: new Date('2026-02-10'),
                status: ApprovalStatus.APPROVED,
                reason: 'Family Trip',
                approvedBy: 'admin'
            },
            {
                employeeId: 'ALICE-001',
                type: LeaveType.SICK,
                startDate: new Date('2026-02-06'),
                endDate: new Date('2026-02-06'),
                status: ApprovalStatus.PENDING,
                reason: 'Fever'
            }
        ]
    });

    // --- 6. 历史数据 ---
    const now = new Date();
    const records = [];
    for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        for (const [key, emp] of Object.entries(employees)) {
            if (key === 'charlie') continue;
            const hourOffset = Math.random() > 0.8 ? 1 : 0;
            const checkIn = new Date(d);
            checkIn.setHours(8 + hourOffset, Math.floor(Math.random() * 59));
            const checkOut = new Date(d);
            checkOut.setHours(18, Math.floor(Math.random() * 59));

            records.push({
                employeeId: emp.employeeId,
                employeeName: emp.name,
                date: dateStr,
                status: hourOffset > 0 ? 'late' : 'present',
                checkInTime: checkIn,
                checkOutTime: checkOut,
            });
        }
    }
    await prisma.attendance.createMany({ data: records });

    console.log('\n✨ 全新的分权账号体系已部署！');
    console.log('--------------------------------------------------');
    console.log('🛠️ 系统管理: admin / admin123');
    console.log('📸 终端账号: scanner_01 / scan_secret_123');
    console.log('👤 员工打卡: alice_emp / pass123 (EMP-001)');
    console.log('--------------------------------------------------');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
