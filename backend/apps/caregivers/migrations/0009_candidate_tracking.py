import django.core.validators
import django.db.models.deletion
import django_jalali.db.models
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('caregivers', '0008_blacklistappeal'),
    ]

    operations = [
        migrations.AlterField(
            model_name='caregiverprofile',
            name='status',
            field=models.CharField(choices=[
                ('draft', 'پیش\u200cنویس'), ('pending', 'در انتظار بررسی'),
                ('needs_more_docs', 'نیاز به مدارک بیشتر'), ('approved', 'تأیید شده'),
                ('rejected', 'رد شده'), ('suspended', 'تعلیق شده'),
            ], db_index=True, default='draft', max_length=20, verbose_name='وضعیت ثبت\u200c نام'),
        ),
        migrations.AddField(
            model_name='caregiverprofile',
            name='interview_score',
            field=models.PositiveSmallIntegerField(
                blank=True, null=True, verbose_name='امتیاز مصاحبه',
                validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)],
            ),
        ),
        migrations.AddField(
            model_name='caregiverprofile',
            name='interview_date',
            field=django_jalali.db.models.jDateField(blank=True, null=True, verbose_name='تاریخ مصاحبه'),
        ),
        migrations.AddField(
            model_name='caregiverprofile',
            name='interviewed_by',
            field=models.ForeignKey(
                blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                related_name='interviewed_caregivers', to=settings.AUTH_USER_MODEL, verbose_name='مصاحبه\u200cکننده',
            ),
        ),
        migrations.AddField(
            model_name='caregiverprofile',
            name='staff_notes',
            field=models.TextField(
                blank=True, max_length=1000, verbose_name='یادداشت\u200cهای داخلی',
                help_text='یادداشت آزاد تیم بررسی یا آژانس درباره این مراقب — برای پیگیری داخلی، نه نمایش عمومی.',
            ),
        ),
        migrations.AddField(
            model_name='caregiverprofile',
            name='needs_more_docs_note',
            field=models.TextField(
                blank=True, max_length=1000, verbose_name='توضیح مدارک مورد نیاز',
                help_text='وقتی وضعیت روی «نیاز به مدارک بیشتر» است، این متن مشخص می\u200cکند چه چیزی از مراقب خواسته شده — به خود مراقب نشان داده می\u200cشود.',
            ),
        ),
    ]
