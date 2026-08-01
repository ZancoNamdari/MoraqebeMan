from apps.accounts.models import User, UserRole


def make_user(
    username="testuser",
    password="StrongPass123",
    phone_number="09120000001",
    email="test@example.com",
    role=UserRole.FAMILY,
    first_name="تست",
    last_name="کاربر",
) -> User:
    """
    Shared test-data builder — every test module that needs a user goes
    through this instead of repeating User.objects.create_user(...) with
    slightly different field sets each time.
    """
    user = User(username=username, phone_number=phone_number, email=email, role=role,
                first_name=first_name, last_name=last_name)
    user.set_password(password)
    user.save()
    return user
