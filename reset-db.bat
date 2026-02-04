@echo off
echo [1/3] 正在等待数据库就绪...
docker-compose run --rm backend sh -c "until nc -z db 5432; do echo 'Waiting for DB...'; sleep 1; done;"
echo [2/3] 正在重置数据库结构并应用所有迁移...
docker-compose run --rm backend npx prisma migrate reset --force
echo [3/3] 正在同步后端代码客户端 (Generate)...
docker exec work_attendance_system-backend-1 npx prisma generate
echo.
echo ✅ 数据库已重置，测试数据已填充，后端代码已同步！
pause