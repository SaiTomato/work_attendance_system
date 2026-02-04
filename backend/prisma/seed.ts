import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 正在初始化考勤系统种子数据...');

    // ⏳ 数据库连接重试逻辑
    let retries = 5;
    while (retries > 0) {
        try {
            await prisma.$connect();
            break;
        } catch (e) {
            console.log(`⏳ 数据库连接中... (剩余重试: ${retries})`);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    // --- 1. 创建考勤规则 (AttendanceRule) ---
    console.log('  - 创建考勤规则...');
    const defaultRule = await prisma.attendanceRule.upsert({
        where: { id: 'default-rule-id' }, // 使用固定 ID 方便测试
        update: {},
        create: {
            id: 'default-rule-id',
            name: '标准办公室工时',
            standardCheckIn: '09:00',
            standardCheckOut: '18:00',
            lateGracePeriod: 5,
            absentThreshold: 120,
            isDefault: true,
        }
    });

    const itRule = await prisma.attendanceRule.upsert({
        where: { id: 'it-rule-id' },
        update: {},
        create: {
            id: 'it-rule-id',
            name: 'IT部弹性工时',
            standardCheckIn: '10:00',
            standardCheckOut: '19:00',
            lateGracePeriod: 15,
            absentThreshold: 180,
            isDefault: false,
        }
    });

    // --- 2. 创建部门 (Department) ---
    console.log('  - 创建部门...');
    const deptTech = await prisma.department.upsert({
        where: { code: 'TECH' },
        update: {},
        create: {
            name: '技术部',
            code: 'TECH',
            description: 'Responsible for software development',
        }
    });

    const deptHR = await prisma.department.upsert({
        where: { code: 'HR' },
        update: {},
        create: {
            name: '人事部',
            code: 'HR',
            description: 'Human resources and recruitment',
        }
    });

    // 为 IT 部绑定 IT 特殊规则 (演示级关联)
    await prisma.attendanceRule.update({
        where: { id: itRule.id },
        data: { departmentId: deptTech.id }
    });

    // --- 3. 创建账号 (User) ---
    console.log('  - 创建系统账号...');
    const hashedAdminPassword = await bcrypt.hash('admin', 10);
    const hashedUserPassword = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedAdminPassword,
            role: 'admin',
        },
    });

    const aliceUser = await prisma.user.upsert({
        where: { username: 'alice' },
        update: {},
        create: {
            username: 'alice',
            password: hashedUserPassword,
            role: 'viewer',
            departmentId: deptTech.id
        },
    });

    // --- 4. 创建员工并关联账号 (Employee) ---
    console.log('  - 创建员工档案...');
    const alice = await prisma.employee.upsert({
        where: { employeeId: 'EMP-001' },
        update: {},
        create: {
            employeeId: 'EMP-001',
            name: 'Alice Chang',
            departmentId: deptTech.id,
            userId: aliceUser.id,
        },
    });

    const bob = await prisma.employee.upsert({
        where: { employeeId: 'EMP-002' },
        update: {},
        create: {
            employeeId: 'EMP-002',
            name: 'Bob Wang',
            departmentId: deptHR.id,
        },
    });

    // --- 5. 创建考勤记录 (Attendance) ---
    console.log('  - 创建考勤流水...');
    const today = new Date().toISOString().split('T')[0];

    // 清理一下今天的旧数据，防止重复执行报错
    await prisma.attendance.deleteMany({ where: { date: today } });

    await prisma.attendance.createMany({
        data: [
            {
                employeeId: alice.employeeId,
                employeeName: alice.name,
                date: today,
                status: 'present',
                checkInTime: new Date(new Date().setHours(8, 55, 0)),
            },
            {
                employeeId: bob.employeeId,
                employeeName: bob.name,
                date: today,
                status: 'late',
                checkInTime: new Date(new Date().setHours(9, 45, 0)),
            },
        ],
    });

    console.log('✅ 考勤系统初始化成功！');
    console.log('   - 默认管理员: admin / admin');
    console.log('   - 测试账号: alice / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
