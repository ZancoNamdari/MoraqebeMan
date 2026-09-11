from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authorization.permissions import IsAdminOrSuperuser

from .models import Article
from .serializers import (
    ArticleDetailSerializer,
    ArticleListItemSerializer,
    CreateArticleSerializer,
    PublicArticleDetailSerializer,
    PublicArticleListItemSerializer,
    UpdateArticleSerializer,
)


class PublicArticleListView(APIView):
    """Published articles only — this is what the public landing page
    calls, deliberately open with no auth at all since it's marketing
    content meant to be read by visitors, not platform users."""
    permission_classes = [AllowAny]

    def get(self, request):
        articles = Article.objects.filter(is_published=True)
        return Response(PublicArticleListItemSerializer(articles, many=True).data)


class PublicArticleDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            article = Article.objects.get(slug=slug, is_published=True)
        except Article.DoesNotExist:
            return Response({"detail": "مقاله یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(PublicArticleDetailSerializer(article).data)


class ArticleListCreateView(APIView):
    """Team-facing — admin/superuser only, matching the exact same
    permission class the rest of the platform's staff-only endpoints
    (complaints, patient notes) already use. Agencies and every other
    role get a plain 403, same as those existing endpoints."""
    permission_classes = [IsAdminOrSuperuser]

    def get(self, request):
        articles = Article.objects.all()
        return Response(ArticleListItemSerializer(articles, many=True).data)

    def post(self, request):
        serializer = CreateArticleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        article = serializer.save(author=request.user)
        return Response(ArticleDetailSerializer(article).data, status=status.HTTP_201_CREATED)


class ArticleDetailView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def get_object(self, pk):
        try:
            return Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return None

    def get(self, request, pk):
        article = self.get_object(pk)
        if article is None:
            return Response({"detail": "مقاله یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(ArticleDetailSerializer(article).data)

    def patch(self, request, pk):
        article = self.get_object(pk)
        if article is None:
            return Response({"detail": "مقاله یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        serializer = UpdateArticleSerializer(article, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ArticleDetailSerializer(article).data)

    def delete(self, request, pk):
        article = self.get_object(pk)
        if article is None:
            return Response({"detail": "مقاله یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        article.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublishArticleView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, pk):
        try:
            article = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({"detail": "مقاله یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        article.publish()
        return Response(ArticleDetailSerializer(article).data)


class UnpublishArticleView(APIView):
    permission_classes = [IsAdminOrSuperuser]

    def post(self, request, pk):
        try:
            article = Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return Response({"detail": "مقاله یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        article.unpublish()
        return Response(ArticleDetailSerializer(article).data)
