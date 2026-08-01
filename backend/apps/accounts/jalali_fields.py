"""
Shared DRF serializer fields for Jalali (Hijri Shamsi) dates.

The database keeps storing standard Gregorian dates underneath — model
fields use django_jalali.db.models.jDateField/jDateTimeField, which
transparently convert to/from jdatetime objects at the Python level
while the actual DB column stays a normal DATE/DATETIME column. These
serializer fields are the API boundary: every date going in or out of
the API is a Jalali string ("1404-05-10"), and the Gregorian storage
underneath is never exposed to a client.

Verified this round-trips correctly (Jalali in -> Gregorian stored ->
Jalali back out unchanged) before wiring it in anywhere — DRF's
auto-generated DateField for a jDateField model field looks like it
works by accident (jdatetime.date.isoformat() happens to produce a
parseable-looking string), but silently mis-parses Jalali strings on
the way IN as if they were Gregorian, which is a real, dangerous bug
if left as the default. These explicit fields exist specifically to
avoid that trap.
"""
import jdatetime
from rest_framework import serializers


class JalaliDateField(serializers.Field):
    def to_representation(self, value):
        if value is None:
            return None
        if isinstance(value, jdatetime.date):
            return value.strftime("%Y-%m-%d")
        return jdatetime.date.fromgregorian(date=value).strftime("%Y-%m-%d")

    def to_internal_value(self, data):
        try:
            return jdatetime.date.fromisoformat(str(data))
        except (ValueError, TypeError):
            raise serializers.ValidationError(
                "تاریخ باید به فرمت شمسی YYYY-MM-DD باشد (مثلاً ۱۴۰۴-۰۵-۱۰)."
            )


class JalaliDateTimeField(serializers.Field):
    def to_representation(self, value):
        if value is None:
            return None
        if isinstance(value, jdatetime.datetime):
            return value.strftime("%Y-%m-%d %H:%M:%S")
        return jdatetime.datetime.fromgregorian(datetime=value).strftime("%Y-%m-%d %H:%M:%S")

    def to_internal_value(self, data):
        try:
            return jdatetime.datetime.strptime(str(data), "%Y-%m-%d %H:%M:%S")
        except (ValueError, TypeError):
            raise serializers.ValidationError(
                "تاریخ/زمان باید به فرمت شمسی YYYY-MM-DD HH:MM:SS باشد."
            )
