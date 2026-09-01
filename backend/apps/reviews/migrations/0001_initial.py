import django.core.validators
import django.db.models.deletion
import django_jalali.db.models
from django.conf import settings
from django.db import migrations, models

import apps.reviews.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('caregivers', '0007_caregiverprofile_status_db_index'),
        ('families', '0009_patient_care_needs'),
    ]

    operations = [
        migrations.CreateModel(
            name='Complaint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[
                    ('service_quality', 'کیفیت خدمات'), ('behavior', 'رفتار نامناسب'),
                    ('punctuality', 'عدم رعایت زمان‌بندی'), ('safety_concern', 'نگرانی ایمنی'),
                    ('financial', 'مسائل مالی'), ('communication', 'مشکل ارتباطی'), ('other', 'سایر'),
                ], max_length=30, verbose_name='دسته‌بندی')),
                ('description', models.TextField(max_length=2000, verbose_name='شرح شکایت')),
                ('voice_note', models.FileField(
                    blank=True, null=True, upload_to=apps.reviews.models.voice_note_upload_path,
                    validators=[django.core.validators.FileExtensionValidator(allowed_extensions=['mp3', 'm4a', 'wav', 'ogg', 'webm', 'aac'])],
                    verbose_name='فایل صوتی',
                )),
                ('status', models.CharField(choices=[
                    ('open', 'باز'), ('under_review', 'در حال بررسی'), ('resolved', 'حل‌شده'), ('dismissed', 'رد شده'),
                ], db_index=True, default='open', max_length=20, verbose_name='وضعیت')),
                ('resolution_note', models.TextField(blank=True, max_length=2000, verbose_name='یادداشت رسیدگی')),
                ('resolved_at', django_jalali.db.models.jDateTimeField(blank=True, null=True, verbose_name='زمان رسیدگی')),
                ('created_at', django_jalali.db.models.jDateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت')),
                ('updated_at', django_jalali.db.models.jDateTimeField(auto_now=True, verbose_name='تاریخ بروزرسانی')),
                ('about_caregiver', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='complaints_about', to='caregivers.caregiverprofile', verbose_name='مراقب مربوطه',
                )),
                ('filed_by', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='complaints_filed',
                    to=settings.AUTH_USER_MODEL, verbose_name='ثبت‌کننده شکایت',
                )),
                ('patient', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='complaints', to='families.patientprofile', verbose_name='سالمند مربوطه',
                )),
                ('resolved_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='complaints_resolved', to=settings.AUTH_USER_MODEL, verbose_name='بررسی‌شده توسط',
                )),
            ],
            options={
                'verbose_name': 'شکایت',
                'verbose_name_plural': 'شکایات',
                'ordering': ['-created_at'],
            },
        ),
    ]
