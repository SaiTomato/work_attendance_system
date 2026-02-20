
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const alice = await prisma.employee.findUnique({
        where: { employeeId: 'EMP-001' },
    });
    console.log('Employee Alice:', alice);

    const today = new Date().toISOString().split('T')[0];
    console.log('Today:', today);

    const records = await prisma.attendance.findMany({
        where: { employeeId: 'EMP-001', date: today },
    });
    console.log('Alice records for today:', JSON.stringify(records, null, 2));

    const rules = await prisma.attendanceRule.findMany();
    console.log('Rules:', JSON.stringify(rules, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
