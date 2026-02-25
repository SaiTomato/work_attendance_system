
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAudit() {
    console.log('--- 🧪 手动审计日志写入测试 ---');
    try {
        const testId = "TEST-" + Date.now();
        const result = await prisma.auditLog.create({
            data: {
                targetId: testId,
                action: 'TEST_WRITE',
                operatedBy: 'DEBUG_SCRIPT',
                reason: '验证表是否允许写入',
                before: { msg: "old" },
                after: { msg: "new" }
            }
        });
        console.log('✅ 写入成功！ID:', result.id);

        const verify = await prisma.auditLog.findUnique({ where: { id: result.id } });
        console.log('🔎 验证读取内容:', verify ? "成功找到" : "未找到");
    } catch (err) {
        console.error('❌ 写入失败！报错详情:');
        console.error(err);
    }
}

testAudit().catch(console.error).finally(() => prisma.$disconnect());
