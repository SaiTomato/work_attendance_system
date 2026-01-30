import { PrismaClient } from '@prisma/client';

// 初始化数据库连接客户端
const prisma = new PrismaClient();

export default prisma;
