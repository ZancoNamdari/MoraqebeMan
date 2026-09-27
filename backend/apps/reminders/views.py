from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.agencies.tenancy import resolve_tenant_context

from . import registry
from .models import ReminderRule
from .serializers import ReminderRuleSerializer, UpsertReminderRuleSerializer
from .services import agency_reminder_rules


class ReminderPipelineOptionsView(APIView):
    """
    GET /api/agencies/<agency_id>/reminder-pipelines/
    Metadata for the Settings UI: every registered pipeline (patients,
    caregiver candidates, episodic services, and anything registered
    later) plus its valid stage choices — so the rule-builder form
    can offer a pipeline dropdown and, once one is picked, populate
    the anchor/display stage dropdowns from THAT pipeline's own
    stages rather than a hardcoded list.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        data = [
            {
                "key": spec.key,
                "label": spec.label,
                "stages": [{"value": v, "label": lbl} for v, lbl in spec.stage_choices],
            }
            for spec in registry.all_specs()
        ]
        return Response(data)


class ReminderRuleListCreateView(APIView):
    """
    GET/POST /api/agencies/<agency_id>/reminder-rules/
    Owner/supervisor-only, same convention as every other tab under
    تنظیمات — unlike the pipelines themselves (which admins can
    operate day-to-day), deciding WHICH reminder rules exist is an
    agency-policy decision.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        pipeline_key = request.query_params.get("pipeline_key")
        # Route every pipeline (or just the requested one) through
        # agency_reminder_rules() so a pipeline with a registered
        # default_rule (episodic services) gets it materialized here
        # too — the Settings screen is often the very first place an
        # agency ever asks about a given pipeline's rules.
        keys = [pipeline_key] if pipeline_key else [spec.key for spec in registry.all_specs()]
        for key in keys:
            agency_reminder_rules(ctx.agency, key)
        rules = ReminderRule.objects.filter(agency=ctx.agency)
        if pipeline_key:
            rules = rules.filter(pipeline_key=pipeline_key)
        return Response(ReminderRuleSerializer(rules, many=True).data)

    def post(self, request, agency_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        serializer = UpsertReminderRuleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rule = serializer.save(agency=ctx.agency)
        return Response(ReminderRuleSerializer(rule).data, status=status.HTTP_201_CREATED)


class ReminderRuleDetailView(APIView):
    """PATCH/DELETE /api/agencies/<agency_id>/reminder-rules/<rule_id>/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, agency_id, rule_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        rule = ReminderRule.objects.filter(id=rule_id, agency=ctx.agency).first()
        if rule is None:
            return Response({"detail": "قانون یادآوری یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UpsertReminderRuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ReminderRuleSerializer(rule).data)

    def delete(self, request, agency_id, rule_id):
        ctx = resolve_tenant_context(request, agency_id)
        if ctx is None:
            return Response(status=status.HTTP_403_FORBIDDEN)
        deleted, _ = ReminderRule.objects.filter(id=rule_id, agency=ctx.agency).delete()
        if not deleted:
            return Response({"detail": "قانون یادآوری یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
