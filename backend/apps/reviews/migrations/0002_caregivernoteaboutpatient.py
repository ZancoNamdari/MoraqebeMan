import django.db.models.deletion
import django_jalali.db.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('caregivers', '0007_caregiverprofile_status_db_index'),
        ('families', '0009_patient_care_needs'),
        ('reviews', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaregiverNoteAboutPatient',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[
                    ('additional_needs', 'نیازهای اضافی افشا نشده'), ('safety_concern', 'نگرانی ایمنی'),
                    ('family_behavior', 'رفتار خانواده یا محیط'), ('health_change', 'تغییر وضعیت سلامت'),
                    ('general_observation', 'مشاهده عمومی'), ('other', 'سایر'),
                ], max_length=30, verbose_name='دسته‌بندی')),
                ('note', models.TextField(max_length=2000, verbose_name='متن یادداشت')),
                ('flagged_urgent', models.BooleanField(
                    db_index=True, default=False,
                    help_text='برای نگرانی‌های ایمنی که نباید منتظر بررسی روتین بماند.',
                    verbose_name='نیازمند توجه فوری',
                )),
                ('acknowledged_at', django_jalali.db.models.jDateTimeField(blank=True, null=True, verbose_name='زمان مشاهده')),
                ('created_at', django_jalali.db.models.jDateTimeField(auto_now_add=True, verbose_name='تاریخ ثبت')),
                ('updated_at', django_jalali.db.models.jDateTimeField(auto_now=True, verbose_name='تاریخ بروزرسانی')),
                ('acknowledged_by', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='patient_notes_acknowledged', to=settings.AUTH_USER_MODEL, verbose_name='دیده‌شده توسط',
                )),
                ('caregiver', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE, related_name='notes_about_patients',
                    to='caregivers.caregiverprofile', verbose_name='مراقب',
                )),
                ('patient', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='caregiver_notes', to='families.patientprofile', verbose_name='سالمند مربوطه',
                )),
            ],
            options={
                'verbose_name': 'یادداشت مراقب درباره سالمند',
                'verbose_name_plural': 'یادداشت\u200cهای مراقب درباره سالمند',
                'ordering': ['-created_at'],
            },
        ),
    ]
