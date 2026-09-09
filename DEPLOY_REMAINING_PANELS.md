# مراحل آماده برای اجرا وقتی اینترنت وصل شد
# ترتیب دقیقاً مثل agency.moraqebman.ir که قبلاً با موفقیت انجام شد —
# اول HTTP، بعد گواهی، بعد HTTPS، بعد ری‌استارت کامل (نه فقط reload).

# ---------------------------------------------------------
# مرحله ۱ — همین الان قابل اجراست (بعد از git pull این فایل‌ها):
# ری‌لود nginx با پنج بلاک HTTP جدید (بدون HTTPS هنوز، چون گواهی
# وجود نداره)
# ---------------------------------------------------------
docker exec moraqebeman-nginx_supervisor-1 nginx -t
docker exec moraqebeman-nginx_supervisor-1 nginx -s reload

# ---------------------------------------------------------
# مرحله ۲ — rebuild و اجرای پنج پنل باقی‌مانده
# (این کار زمان می‌بره — روی این سرور، هر پنل حدود ۵-۹ دقیقه طول
# کشید وقتی ۴ تا با هم build شدن؛ شاید بهتر باشه یکی‌یکی build کنید
# تا سرور بیش‌ازحد کند نشه)
# ---------------------------------------------------------
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache family_panel
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache patient_panel
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache caregiver_panel
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache admin_panel
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache superuser_panel
docker compose -f docker-compose.prod.yml --env-file .env build --no-cache landing_page

docker compose -f docker-compose.prod.yml --env-file .env up -d family_panel patient_panel caregiver_panel admin_panel superuser_panel landing_page

# ---------------------------------------------------------
# مرحله ۳ — گرفتن گواهی SSL برای هر پنج دامنه (پنج دستور جدا،
# دقیقاً مثل الگوی agency.moraqebman.ir)
# ---------------------------------------------------------
docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.supervisor.yml \
  -f docker-compose.supervisor-nginx.yml \
  -f docker-compose.certbot.yml \
  --env-file .env \
  run --rm certbot certonly --webroot -w /var/www/certbot -d family.moraqebman.ir --agree-tos --register-unsafely-without-email --non-interactive

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.supervisor.yml \
  -f docker-compose.supervisor-nginx.yml \
  -f docker-compose.certbot.yml \
  --env-file .env \
  run --rm certbot certonly --webroot -w /var/www/certbot -d patient.moraqebman.ir --agree-tos --register-unsafely-without-email --non-interactive

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.supervisor.yml \
  -f docker-compose.supervisor-nginx.yml \
  -f docker-compose.certbot.yml \
  --env-file .env \
  run --rm certbot certonly --webroot -w /var/www/certbot -d caregiver.moraqebman.ir --agree-tos --register-unsafely-without-email --non-interactive

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.supervisor.yml \
  -f docker-compose.supervisor-nginx.yml \
  -f docker-compose.certbot.yml \
  --env-file .env \
  run --rm certbot certonly --webroot -w /var/www/certbot -d admin.moraqebman.ir --agree-tos --register-unsafely-without-email --non-interactive

docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.supervisor.yml \
  -f docker-compose.supervisor-nginx.yml \
  -f docker-compose.certbot.yml \
  --env-file .env \
  run --rm certbot certonly --webroot -w /var/www/certbot -d superuser.moraqebman.ir --agree-tos --register-unsafely-without-email --non-interactive

# نکته: برای صفحه فرود، هم moraqebman.ir و هم www.moraqebman.ir باید
# روی همون یک گواهی پوشش داده بشن — با دو تا -d در یک دستور:
docker compose \
  -f docker-compose.prod.yml \
  -f docker-compose.supervisor.yml \
  -f docker-compose.supervisor-nginx.yml \
  -f docker-compose.certbot.yml \
  --env-file .env \
  run --rm certbot certonly --webroot -w /var/www/certbot -d moraqebman.ir -d www.moraqebman.ir --agree-tos --register-unsafely-without-email --non-interactive

# ---------------------------------------------------------
# مرحله ۴ — بعد از موفقیت هر پنج گواهی، این پنج بلاک HTTPS رو
# قبل از خط "# API HTTPS" (یا هر جای مناسب) به
# gateway/nginx.supervisor.conf اضافه کنید — من این کار رو وقتی
# اینترنت وصل شد و خروجی certbot رو دیدم، مستقیماً برایتان انجام
# می‌دهم؛ این بخش فقط برای مرجع است اگر خودتان زودتر خواستید انجام
# بدهید.
# ---------------------------------------------------------
#    server {
#        listen 443 ssl;
#        server_name family.moraqebman.ir;
#        ssl_certificate /etc/letsencrypt/live/family.moraqebman.ir/fullchain.pem;
#        ssl_certificate_key /etc/letsencrypt/live/family.moraqebman.ir/privkey.pem;
#        ssl_protocols TLSv1.2 TLSv1.3;
#        location / {
#            proxy_pass http://family_panel;
#            proxy_http_version 1.1;
#            proxy_set_header Host $host;
#            proxy_set_header X-Real-IP $remote_addr;
#            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#            proxy_set_header X-Forwarded-Proto $scheme;
#            proxy_set_header Upgrade $http_upgrade;
#            proxy_set_header Connection "upgrade";
#        }
#    }
# (همین الگو برای patient، caregiver، admin، superuser هم تکرار می‌شود،
#  فقط اسم دامنه و upstream عوض می‌شود)
#
#    server {
#        listen 443 ssl;
#        server_name moraqebman.ir www.moraqebman.ir;
#        ssl_certificate /etc/letsencrypt/live/moraqebman.ir/fullchain.pem;
#        ssl_certificate_key /etc/letsencrypt/live/moraqebman.ir/privkey.pem;
#        ssl_protocols TLSv1.2 TLSv1.3;
#        location / {
#            proxy_pass http://landing_page;
#            proxy_http_version 1.1;
#            proxy_set_header Host $host;
#            proxy_set_header X-Real-IP $remote_addr;
#            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#            proxy_set_header X-Forwarded-Proto $scheme;
#        }
#    }

# ---------------------------------------------------------
# مرحله ۵ — نکته حیاتی: بعد از اضافه کردن بلاک‌های HTTPS، حتماً
# RESTART کامل کنید، نه فقط reload — این باگ nginx (عدم بازسازی
# جدول SNI با reload ساده) همون چیزیه که برای agency هم رخ داد.
# ---------------------------------------------------------
docker exec moraqebeman-nginx_supervisor-1 nginx -t
docker restart moraqebeman-nginx_supervisor-1

# ---------------------------------------------------------
# مرحله ۶ — تست نهایی هر پنج دامنه
# ---------------------------------------------------------
curl -v https://family.moraqebman.ir 2>&1 | grep -A 3 "subject:"
curl -v https://patient.moraqebman.ir 2>&1 | grep -A 3 "subject:"
curl -v https://caregiver.moraqebman.ir 2>&1 | grep -A 3 "subject:"
curl -v https://admin.moraqebman.ir 2>&1 | grep -A 3 "subject:"
curl -v https://superuser.moraqebman.ir 2>&1 | grep -A 3 "subject:"
curl -v https://moraqebman.ir 2>&1 | grep -A 3 "subject:"
