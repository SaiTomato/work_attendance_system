@echo off
docker-compose run --rm backend sh -c "until nc -z db 5432; do echo 'Waiting for DB...'; sleep 1; done; npx prisma migrate reset --force"
pause