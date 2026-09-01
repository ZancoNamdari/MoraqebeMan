import django.db.models.deletion
import django_jalali.db.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('caregivers', '0007_caregiverprofile_status_db_index'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlacklistAppeal',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('appeal_reason', models.TextField(max_length=2000, verbose_name='توضیح مراقب برای درخواست بازبینی')),
                ('status', models.CharField(choices=[
                    ('pending', 'در انتظار بررسی'), ('approved', 'پذیرفته\u200cشده (رفع مسدودیت)'), ('denied', 'رد شده'),
                ], db_index=True, default='pending', max_length=20, verbose_name='وضعیت')),
                ('review_note', models.TextField(blank=True, max_length=2000, verbose_name='یادداشت بررسی')),
                ('reviewed_at', django_jalali.db.models.jDateTimeField(blank=True, null=True, verbose_name='زمان بررسی')),
                ('created_at', django_jalali.db.models.jDateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت درخواست')),
                ('caregiver', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='blacklist_appeals',
                    to='caregivers.caregiverprofile', verbose_name='مراقب',
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='blacklist_appeals_reviewed', to=settings.AUTH_USER_MODEL, verbose_name='بررسی\u200cشده توسط',
                )),
            ],
            options={
                'verbose_name': 'درخواست بازبینی مسدودیت',
                'verbose_name_plural': 'درخواست\u200cهای بازبینی مسدودیت',
                'ordering': ['-created_at'],
            },
        ),
    ]
