from django.core.cache import cache
from django.test import TestCase


class BaseAPITestCase(TestCase):
    """
    Every integration test that hits a throttled endpoint (login,
    register, password-reset) must inherit from this instead of plain
    TestCase. Django's TestCase wraps each test in a DB transaction and
    rolls it back, but our rate-limit and lockout state lives in Redis
    via the cache framework — that state is NOT part of the DB
    transaction, so without clearing it explicitly, one test's failed
    login attempts or throttle hits leak into the next test and cause
    spurious 429/423 responses. Found this the hard way: the first
    version of this suite had ~11 tests failing with KeyError on
    response.data["tokens"] because setUp()'s login call was silently
    getting throttled by an earlier test class's leftover counter.
    """
    def setUp(self):
        super().setUp()
        cache.clear()

    def tearDown(self):
        cache.clear()
        super().tearDown()
