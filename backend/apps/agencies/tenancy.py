from __future__ import annotations

"""
Central tenant-context resolution.

Before this module, "is this user allowed to act on behalf of this
agency" was resolved independently in two places: an inline function
in apps.agencies.views (_resolve_agency_for_actor) and a separate,
differently-shaped check inside apps.caregivers.supervisor_views
(_caregiver_visible_to_actor). Two separately-written implementations
of the same underlying question is exactly the shape of bug the
platform's own risk review flagged as the most dangerous kind of
mistake in a multi-tenant system: one of the two could drift, get a
role check slightly wrong, or simply be missed the next time a new
agency-scoped endpoint gets added.

This module is now the one place that answers:
  1. Which agency (if any) can this request act on behalf of?
     -> resolve_tenant_context()
  2. Which caregivers belong to a given agency's own approved roster?
     -> agency_caregiver_profile_ids() / agency_caregiver_user_ids()
  3. Is one specific caregiver part of a given agency's roster?
     -> caregiver_visible_to_tenant()

Every call site that used to duplicate this logic (apps.agencies.
views, apps.caregivers.supervisor_views, apps.care.matching.
agency_scoped) now calls into here instead. This is a structural
refactor — deliberately not a behavior change; every existing test
covering agency-scoping continues to assert the exact same access
rules as before, just enforced from one place.
"""

from dataclasses import dataclass

from apps.accounts.models import UserRole


@dataclass(frozen=True)
class TenantContext:
    """
    A resolved, verified tenant context for the current request.
    Constructing one of these (via resolve_tenant_context below) IS
    the security check — callers should never independently re-derive
    "which agency does this user act for" through any other path.
    """
    agency: "AgencyProfile"  # noqa: F821 — string annotation avoids a circular import at module load time
    actor_role: str  # "owner" | "supervisor" | "superuser"


def resolve_tenant_context(
    request,
    agency_id: int,
    allow_supervisor: bool = True,
    allow_admin: bool = False,
) -> TenantContext | None:
    """
    Returns a TenantContext if request.user may act on behalf of
    agency_id, else None (callers turn that into a 403).

    allow_supervisor defaults to True — the overwhelming majority of
    agency-scoped operations (creating patients, viewing rosters,
    requesting matching) are exactly a supervisor's day-to-day job.
    The one deliberate exception is creating a NEW supervisor, which
    explicitly passes allow_supervisor=False, since a supervisor
    creating a peer supervisor was never part of the confirmed
    requirement.

    allow_admin defaults to False — deliberately opt-in, unlike
    allow_supervisor. AGENCY_ADMIN is a newer, narrower-scoped role
    (see AgencyAdmin's own docstring) than a supervisor, and most
    existing agency-scoped endpoints were built and tested before it
    existed; changing the default here would silently grant every one
    of them to admins without each call site explicitly deciding
    that's correct. Only the patient Kanban endpoints pass
    allow_admin=True today.
    """
    from .models import AgencyProfile

    if request.user.role == UserRole.SUPERUSER:
        agency = AgencyProfile.objects.filter(id=agency_id).first()
        return TenantContext(agency=agency, actor_role="superuser") if agency else None

    if request.user.role == UserRole.AGENCY:
        agency = AgencyProfile.objects.filter(id=agency_id, user_id=request.user.id).first()
        return TenantContext(agency=agency, actor_role="owner") if agency else None

    if allow_supervisor and request.user.role == UserRole.AGENCY_SUPERVISOR:
        supervisor_profile = getattr(request.user, "agency_supervisor_profile", None)
        if supervisor_profile is not None and supervisor_profile.agency_id == agency_id:
            return TenantContext(agency=supervisor_profile.agency, actor_role="supervisor")

    if allow_admin and request.user.role == UserRole.AGENCY_ADMIN:
        admin_profile = getattr(request.user, "agency_admin_profile", None)
        if admin_profile is not None and admin_profile.agency_id == agency_id:
            return TenantContext(agency=admin_profile.agency, actor_role="admin")

    return None


def visible_creator_user_ids(request_user) -> list[int] | None:
    """
    For the patient Kanban board's data-scoping rule (per the
    confirmed requirement): given the current request's user, returns
    the list of user ids whose CREATED patients this person should
    see, or None to mean "no restriction — see everyone in the
    agency" (owner/superuser).

    - owner/superuser: None (unrestricted — filtered by agency alone
      elsewhere, same as before this function existed).
    - supervisor: themselves + every AgencyAdmin reporting to them.
    - admin: themselves only.
    """
    if request_user.role in (UserRole.SUPERUSER, UserRole.AGENCY):
        return None

    if request_user.role == UserRole.AGENCY_SUPERVISOR:
        supervisor_profile = getattr(request_user, "agency_supervisor_profile", None)
        if supervisor_profile is None:
            return [request_user.id]
        admin_user_ids = list(supervisor_profile.admins.values_list("user_id", flat=True))
        return [request_user.id, *admin_user_ids]

    if request_user.role == UserRole.AGENCY_ADMIN:
        return [request_user.id]

    return None


def resolve_own_agency_for_supervisor(user) -> "AgencyProfile | None":  # noqa: F821
    """
    For endpoints keyed by something OTHER than an explicit agency_id
    in the URL (the caregiver wizard's sub-views are keyed by the
    caregiver's own user_id) — an AGENCY_SUPERVISOR always acts as
    themselves, so there's no id to verify against, just "what is my
    own agency". Kept separate from resolve_tenant_context() rather
    than forcing an artificial agency_id through it.
    """
    if user.role != UserRole.AGENCY_SUPERVISOR:
        return None
    supervisor_profile = getattr(user, "agency_supervisor_profile", None)
    return supervisor_profile.agency if supervisor_profile is not None else None


def agency_caregiver_profile_ids(agency):
    """CaregiverProfile ids with an APPROVED link to this agency —
    the actual candidate pool for agency-scoped matching."""
    from .models import AgencyCaregiverLink, AgencyLinkStatus
    return AgencyCaregiverLink.objects.filter(
        agency=agency, status=AgencyLinkStatus.APPROVED,
    ).values_list("caregiver_id", flat=True)


def agency_caregiver_user_ids(agency):
    """User ids (not CaregiverProfile ids) with an APPROVED link to
    this agency — used where the caller is filtering a User queryset
    rather than a CaregiverProfile queryset."""
    from .models import AgencyCaregiverLink, AgencyLinkStatus
    return AgencyCaregiverLink.objects.filter(
        agency=agency, status=AgencyLinkStatus.APPROVED,
    ).values_list("caregiver__user_id", flat=True)


def caregiver_visible_to_tenant(agency, caregiver_user_id: int) -> bool:
    """Whether one specific caregiver (by user_id) is part of this
    agency's own APPROVED roster."""
    from .models import AgencyCaregiverLink, AgencyLinkStatus
    return AgencyCaregiverLink.objects.filter(
        caregiver__user_id=caregiver_user_id, agency=agency, status=AgencyLinkStatus.APPROVED,
    ).exists()
