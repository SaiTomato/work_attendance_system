
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    console.log('--- Checking AuditLogs ---');
    const logs = await prisma.auditLog.findMany({
        orderBy: { operatedAt: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(logs, null, 2));

    console.log('--- Checking Recent Attendance Records ---');
    const attendance = await prisma.attendance.findMany({
        orderBy: { recordTime: 'desc' },
        take: 5
    });
    console.log(JSON.stringify(attendance, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
