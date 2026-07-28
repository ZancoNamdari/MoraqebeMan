from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.serializers import UserSerializer

from .permissions import IsSuperuser
from .services import RoleChangeError, RoleChangeRequest, RoleChangeService


class ChangeUserRoleView(APIView):
    """
    PATCH /api/auth/users/<id>/role/
    Restricted to SUPERUSER — the only role permitted to change another
    user's role, per the platform's RBAC model.
    """
    permission_classes = [IsSuperuser]

    def patch(self, request, user_id: int):
        new_role = request.data.get("role")
        if not new_role:
            return Response({"detail": "فیلد role الزامی است."}, status=status.HTTP_400_BAD_REQUEST)

        service = RoleChangeService()
        try:
            user = service.change_role(RoleChangeRequest(
                target_user_id=user_id,
                new_role=new_role,
                changed_by_user_id=request.user.id,
            ))
        except RoleChangeError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(UserSerializer(user).data)
