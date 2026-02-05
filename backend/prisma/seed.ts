import { PrismaClient, Position, EmployeeStatus, WorkLocation } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 正在初始化考勤系统高级测试数据...');

    // --- 1. 创建部门 ---
    console.log('  - 创建部门 (TECH, HR, SALES, GEN)...');
    const deptTech = await prisma.department.upsert({
        where: { code: 'TECH' }, update: {},
        create: { name: '技术部', code: 'TECH', description: 'Software and Infrastructure' }
    });
    const deptHR = await prisma.department.upsert({
        where: { code: 'HR' }, update: {},
        create: { name: '人事部', code: 'HR' }
    });
    const deptSales = await prisma.department.upsert({
        where: { code: 'SALES' }, update: {},
        create: { name: '销售部', code: 'SALES' }
    });
    const deptGen = await prisma.department.upsert({
        where: { code: 'GEN' }, update: {},
        create: { name: '总务部', code: 'GEN' }
    });

    // --- 2. 创建系统账号 (User) ---
    console.log('  - 创建系统账号 (admin, chief, alice)...');
    const hashedPass = await bcrypt.hash('admin123', 10);

    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' }, update: {},
        create: { username: 'admin', password: hashedPass, role: 'admin' }
    });

    const chiefUser = await prisma.user.upsert({
        where: { username: 'chief' }, update: {},
        create: { username: 'chief', password: hashedPass, role: 'manager', departmentId: deptTech.id }
    });

    const aliceUser = await prisma.user.upsert({
        where: { username: 'alice' }, update: {},
        create: { username: 'alice', password: hashedPass, role: 'viewer', departmentId: deptTech.id }
    });

    // --- 3. 创建员工档案 (含职位与状态) ---
    console.log('  - 创建多元化员工档案...');

    // 社长 (CEO)
    await prisma.employee.upsert({
        where: { employeeId: 'EMP-000' }, update: {},
        create: {
            employeeId: 'EMP-000',
            name: '山田 太郎',
            position: Position.CEO,
            status: EmployeeStatus.ACTIVE,
            hireDate: new Date('2020-01-01'),
            departmentId: deptGen.id,
        }
    });

    // 技术部长 (MANAGER)
    const chiefEmp = await prisma.employee.upsert({
        where: { employeeId: 'EMP-001' }, update: {},
        create: {
            employeeId: 'EMP-001',
            name: 'Chief Officer',
            position: Position.MANAGER,
            status: EmployeeStatus.ACTIVE,
            hireDate: new Date('2022-05-15'),
            departmentId: deptTech.id,
            userId: chiefUser.id
        }
    });

    // 员工 Alice
    await prisma.employee.upsert({
        where: { employeeId: 'ALICE-001' }, update: {},
        create: {
            employeeId: 'ALICE-001',
            name: 'Alice Chang',
            position: Position.STAFF,
            status: EmployeeStatus.ACTIVE,
            hireDate: new Date('2023-01-10'),
            departmentId: deptTech.id,
            userId: aliceUser.id
        }
    });

    // 居家办公的员工 (REMOTE)
    await prisma.employee.upsert({
        where: { employeeId: 'EMP-002' }, update: {},
        create: {
            employeeId: 'EMP-002',
            name: 'Bob Wang',
            position: Position.STAFF,
            status: EmployeeStatus.ACTIVE,
            workLocation: WorkLocation.REMOTE,
            locationStartDate: new Date(),
            departmentId: deptTech.id,
        }
    });

    // 正在休假的员工 (ON_LEAVE)
    await prisma.employee.upsert({
        where: { employeeId: 'EMP-003' }, update: {},
        create: {
            employeeId: 'EMP-003',
            name: 'Charlie Li',
            position: Position.STAFF,
            status: EmployeeStatus.ON_LEAVE,
            leaveStartDate: new Date('2026-02-01'),
            leaveEndDate: new Date('2026-02-28'),
            departmentId: deptHR.id,
        }
    });

    // --- 4. 考勤规则 (AttendanceRule) ---
    console.log('  - 创建默认考勤规则...');
    await prisma.attendanceRule.upsert({
        where: { id: 'default-rule-id' }, update: {},
        create: {
            id: 'default-rule-id',
            name: '标准上班时间',
            standardCheckIn: '09:00',
            standardCheckOut: '18:00',
            isDefault: true
        }
    });

    // --- 5. 考勤记录 ---
    console.log('  - 创建今日考勤快照...');
    const today = new Date().toISOString().split('T')[0];
    await prisma.attendance.deleteMany({ where: { date: today } });

    await prisma.attendance.createMany({
        data: [
            {
                employeeId: 'EMP-001',
                employeeName: 'Chief Officer',
                date: today,
                status: 'present',
                checkInTime: new Date(new Date().setHours(8, 55, 0)),
            },
            {
                employeeId: 'EMP-002',
                employeeName: 'Bob Wang',
                date: today,
                status: 'wfh',
                checkInTime: new Date(new Date().setHours(10, 0, 0)),
            }
        ]
    });

    console.log('✅ 考勤系统初始化成功！');
    console.log('   - 管理员账号: admin / admin123');
    console.log('   - 经理账号: chief / admin123');
    console.log('   - 员工账号: alice / admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
