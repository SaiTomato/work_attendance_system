import { PrismaClient, UserRole, Gender, Position, EmployeeStatus, WorkLocation, DutyStatus, ApprovalStatus, LeaveType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 データベースのシード処理を開始します...');

    // 1. 既存データのクリーンアップ
    // 既存のデータを削除して重複を防ぐ
    await prisma.attendance.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.leaveRequest.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.department.deleteMany({});
    await prisma.attendanceRule.deleteMany({});

    // 2. 所属部署の作成
    const hrDep = await prisma.department.create({
        data: { name: '人事部', code: 'HR001', description: '人材採用および勤怠管理の担当' }
    });
    const itDep = await prisma.department.create({
        data: { name: 'ITソリューション部', code: 'IT001', description: 'システム開発およびインフラ管理' }
    });
    const salesDep = await prisma.department.create({
        data: { name: '営業部', code: 'SL001', description: '新規顧客開拓および顧客維持' }
    });

    // 3. システム共通ルールの作成
    const defaultRule = await prisma.attendanceRule.create({
        data: {
            name: '標準勤務規則 (09:00-18:00)',
            standardCheckIn: '09:00',
            standardCheckOut: '18:00',
            windowStart: '07:00',
            windowEnd: '14:00',
            autoCheckoutTime: '20:00',
            isDefault: true
        }
    });

    // 4. アカウント作成用の共通パスワード
    const hashedPassword = await bcrypt.hash('pass123', 10);

    // 5. 特権アカウント (Admin) の作成 - 社員プロファイルなし
    await prisma.user.create({
        data: {
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        }
    });

    // 6. 勤怠端末専用アカウント (Terminal) の作成 - 社員プロファイルなし
    await prisma.user.create({
        data: {
            username: 'terminal',
            password: hashedPassword,
            role: 'terminal'
        }
    });

    // 7. マネージャー (Manager) の作成
    const managerEmp = await prisma.employee.create({
        data: {
            employeeId: 'MGR001',
            name: '田中 部長',
            gender: 'MALE',
            age: 45,
            phone: '090-1111-2222',
            email: 'tanaka@example.com',
            departmentId: itDep.id,
            position: 'MANAGER',
            status: 'ACTIVE',
            dutyStatus: 'NORMAL',
            workLocation: 'OFFICE',
            hireDate: new Date('2015-01-01')
        }
    });

    await prisma.user.create({
        data: {
            username: 'manager',
            password: hashedPassword,
            role: 'manager',
            employeeId: managerEmp.employeeId,
            departmentId: itDep.id
        }
    });

    // 8. 一般社員 (Viewer) の作成
    const viewerEmp = await prisma.employee.create({
        data: {
            employeeId: 'EMP001',
            name: '佐藤 太郎',
            gender: 'MALE',
            age: 28,
            phone: '080-3333-4444',
            email: 'sato@example.com',
            departmentId: salesDep.id,
            position: 'STAFF',
            status: 'ACTIVE',
            dutyStatus: 'NORMAL',
            workLocation: 'OFFICE',
            hireDate: new Date('2022-04-01')
        }
    });

    await prisma.user.create({
        data: {
            username: 'viewer',
            password: hashedPassword,
            role: 'viewer',
            employeeId: viewerEmp.employeeId,
            departmentId: salesDep.id
        }
    });

    // 9. 人事担当者 (HR) の作成
    const hrEmp = await prisma.employee.create({
        data: {
            employeeId: 'HR001',
            name: '鈴木 花子',
            gender: 'FEMALE',
            age: 35,
            phone: '070-5555-6666',
            email: 'suzuki@example.com',
            departmentId: hrDep.id,
            position: 'GENERAL_AFFAIRS',
            status: 'ACTIVE',
            dutyStatus: 'NORMAL',
            workLocation: 'OFFICE',
            hireDate: new Date('2018-06-01')
        }
    });

    await prisma.user.create({
        data: {
            username: 'hruser',
            password: hashedPassword,
            role: 'hr',
            employeeId: hrEmp.employeeId,
            departmentId: hrDep.id
        }
    });

    // 10. 大量のテスト従業員データ作成 (UI/パフォーマンス確認用)
    console.log('--- 大量のテストデータを生成中...');
    for (let i = 1; i <= 20; i++) {
        const eid = `TEST${i.toString().padStart(3, '0')}`;
        await prisma.employee.create({
            data: {
                employeeId: eid,
                name: `テスト社員 ${i}`,
                gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
                age: 20 + (i % 30),
                phone: `000-0000-${i.toString().padStart(4, '0')}`,
                email: `test${i}@example.com`,
                departmentId: i % 2 === 0 ? itDep.id : salesDep.id,
                position: 'STAFF',
                status: 'ACTIVE',
                dutyStatus: 'NORMAL',
                workLocation: i % 5 === 0 ? 'REMOTE' : 'OFFICE',
                hireDate: new Date()
            }
        });
    }

    // 11. 休暇申請サンプルの作成
    await prisma.leaveRequest.create({
        data: {
            employeeId: viewerEmp.employeeId,
            type: 'PAID',
            startDate: new Date(),
            endDate: new Date(Date.now() + 86400000), // 明日まで
            reason: '家庭の事情により休暇をいただきます',
            status: 'PENDING'
        }
    });

    console.log('\n✨ シードデータの作成が完了しました！');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
