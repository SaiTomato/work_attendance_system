import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 正在播种种子数据...');

    // ⏳ 增加重试逻辑，防止 db 容器还没初始化好
    let retries = 5;
    while (retries > 0) {
        try {
            await prisma.$connect();
            break;
        } catch (e) {
            console.log(`⏳ 数据库还在穿衣服，请稍等... (重试次数剩余: ${retries})`);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }

    // 1. 创建员工
    const alice = await prisma.employee.upsert({
        where: { employeeId: 'EMP-001' },
        update: {},
        create: {
            employeeId: 'EMP-001',
            name: 'Alice Chang',
            departmentId: 'ENG',
        },
    });

    const bob = await prisma.employee.upsert({
        where: { employeeId: 'EMP-002' },
        update: {},
        create: {
            employeeId: 'EMP-002',
            name: 'Bob Wang',
            departmentId: 'HR',
        },
    });

    const charlie = await prisma.employee.upsert({
        where: { employeeId: 'EMP-003' },
        update: {},
        create: {
            employeeId: 'EMP-003',
            name: 'Charlie Li',
            departmentId: 'SALES',
        },
    });

    // 2. 为今天创建考勤记录
    const today = new Date().toISOString().split('T')[0];

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
            {
                employeeId: charlie.employeeId,
                employeeName: charlie.name,
                date: today,
                status: 'absent',
            },
        ],
        skipDuplicates: true,
    });

    console.log('✅ 种子数据播种完毕！');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
