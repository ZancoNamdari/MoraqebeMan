from django.urls import path

from .views import (
    ArticleDetailView,
    ArticleListCreateView,
    PublicArticleDetailView,
    PublicArticleListView,
    PublishArticleView,
    UnpublishArticleView,
)

urlpatterns = [
    # Public — no auth, used by the landing page
    path("articles/public/", PublicArticleListView.as_view(), name="articles-public-list"),
    path("articles/public/<slug:slug>/", PublicArticleDetailView.as_view(), name="articles-public-detail"),

    # Team-only — admin/superuser, used by admin-panel
    path("articles/", ArticleListCreateView.as_view(), name="articles-list-create"),
    path("articles/<int:pk>/", ArticleDetailView.as_view(), name="articles-detail"),
    path("articles/<int:pk>/publish/", PublishArticleView.as_view(), name="articles-publish"),
    path("articles/<int:pk>/unpublish/", UnpublishArticleView.as_view(), name="articles-unpublish"),
]
