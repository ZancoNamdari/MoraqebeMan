from rest_framework import serializers

from apps.accounts.models import User

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    """
    actor_user_id/target_user_id are plain integers on the model, not
    FKs (deliberately, per AuditLog's own docstring — an immutable
    trail shouldn't cascade-delete or break when an account is later
    removed). Names are resolved here via a batch lookup the view
    passes in through context, not a per-row query — the same N+1
    mistake already found and fixed elsewhere in this codebase, not
    repeated here from the start.
    """
    actor_name = serializers.SerializerMethodField()
    target_name = serializers.SerializerMethodField()
    event_type_label = serializers.CharField(source="get_event_type_display", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "event_type", "event_type_label", "actor_user_id", "actor_name",
            "target_user_id", "target_name", "metadata", "created_at",
        ]

    def get_actor_name(self, obj):
        return self._name_for(obj.actor_user_id)

    def get_target_name(self, obj):
        return self._name_for(obj.target_user_id)

    def _name_for(self, user_id):
        if user_id is None:
            return None
        names = self.context.get("user_names", {})
        return names.get(user_id, f"کاربر #{user_id}")


def build_user_names_map(user_ids: set[int]) -> dict[int, str]:
    """
    One query for every name a page of audit log entries needs,
    instead of one query per row — called once by each view before
    serializing, then passed through serializer context.
    """
    user_ids = {uid for uid in user_ids if uid is not None}
    if not user_ids:
        return {}
    names = {}
    for user in User.objects.filter(id__in=user_ids).only("id", "first_name", "last_name", "username"):
        full_name = f"{user.first_name} {user.last_name}".strip()
        names[user.id] = full_name or user.username
    return names
