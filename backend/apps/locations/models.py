
from django.db import models


class Province(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="استان",
    )
    ordering_number = models.PositiveSmallIntegerField(
        verbose_name="ترتیب نمایش",
        default=0,
        db_index=True,

    )

    class Meta:
        ordering = ["ordering_number"]
        verbose_name = "استان"
        verbose_name_plural = "استان‌ها"

    def __str__(self):
        return self.name


class City(models.Model):
    province = models.ForeignKey(
        Province,
        on_delete=models.CASCADE,
        related_name="cities",
        verbose_name="استان",
    )

    name = models.CharField(
        max_length=100,
        verbose_name="شهر",
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "شهر"
        verbose_name_plural = "شهرها"
        constraints = [
            models.UniqueConstraint(
                fields=["province", "name"],
                name="unique_city_per_province",
            )
        ]

    def __str__(self):
        return self.name


class District(models.Model):
    city = models.ForeignKey(
        City,
        on_delete=models.CASCADE,
        related_name="districts",
        verbose_name="شهر",
    )

    municipality_zone = models.PositiveSmallIntegerField(
        verbose_name="منطقه شهرداری",
        db_index=True,
        null=True,
        blank=True,
    )

    name = models.CharField(
        max_length=100,
        verbose_name="محله",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["municipality_zone", "name"]
        verbose_name = "محله"
        verbose_name_plural = "محله‌ها"
        

    def __str__(self):
        if self.municipality_zone:
            return f"منطقه {self.municipality_zone} - {self.name}"
        return self.name or "بدون محله"