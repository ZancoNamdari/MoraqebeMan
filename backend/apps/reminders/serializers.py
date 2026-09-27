from rest_framework import serializers

from . import registry
from .models import ReminderRule


class ReminderRuleSerializer(serializers.ModelSerializer):
    pipeline_label = serializers.SerializerMethodField()
    anchor_stage_display = serializers.SerializerMethodField()
    display_stage_display = serializers.SerializerMethodField()
    color_display = serializers.CharField(source="get_color_display", read_only=True)

    class Meta:
        model = ReminderRule
        fields = [
            "id", "pipeline_key", "pipeline_label", "anchor_stage", "anchor_stage_display",
            "display_stage", "display_stage_display", "days_threshold", "label", "color",
            "color_display", "is_active",
        ]
        read_only_fields = ["id"]

    def _stage_label(self, obj, value):
        spec = registry.get(obj.pipeline_key)
        if spec is None:
            return value
        return dict(spec.stage_choices).get(value, value)

    def get_pipeline_label(self, obj):
        spec = registry.get(obj.pipeline_key)
        return spec.label if spec else obj.pipeline_key

    def get_anchor_stage_display(self, obj):
        return self._stage_label(obj, obj.anchor_stage)

    def get_display_stage_display(self, obj):
        return self._stage_label(obj, obj.display_stage)


class UpsertReminderRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderRule
        fields = ["pipeline_key", "anchor_stage", "display_stage", "days_threshold", "label", "color", "is_active"]

    def validate_pipeline_key(self, value):
        if registry.get(value) is None:
            raise serializers.ValidationError("این کاریز (pipeline) شناخته‌شده نیست.")
        return value

    def validate(self, attrs):
        pipeline_key = attrs.get("pipeline_key", getattr(self.instance, "pipeline_key", None))
        spec = registry.get(pipeline_key)
        if spec is not None:
            valid_values = [choice[0] for choice in spec.stage_choices]
            for field in ("anchor_stage", "display_stage"):
                if field in attrs and attrs[field] not in valid_values:
                    raise serializers.ValidationError({field: f"باید یکی از {valid_values} باشد."})
        return attrs
