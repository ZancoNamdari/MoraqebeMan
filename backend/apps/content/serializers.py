from rest_framework import serializers

from .models import Article


class PublicArticleListItemSerializer(serializers.ModelSerializer):
    """What the public landing page sees — published articles only,
    no draft/authoring fields exposed at all."""
    class Meta:
        model = Article
        fields = ["id", "title", "slug", "summary", "cover_image", "published_at"]


class PublicArticleDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["id", "title", "slug", "summary", "body", "cover_image", "published_at"]


class ArticleListItemSerializer(serializers.ModelSerializer):
    """Team-facing list view — includes drafts and authoring metadata,
    unlike the public serializer above."""
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)

    class Meta:
        model = Article
        fields = [
            "id", "title", "slug", "summary", "cover_image",
            "is_published", "author_username", "created_at", "updated_at", "published_at",
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True, default=None)

    class Meta:
        model = Article
        fields = [
            "id", "title", "slug", "summary", "body", "cover_image",
            "is_published", "author_username", "created_at", "updated_at", "published_at",
        ]


class CreateArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["title", "summary", "body", "cover_image"]

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError("عنوان نمی‌تواند خالی باشد.")
        return value.strip()


class UpdateArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ["title", "summary", "body", "cover_image"]
        extra_kwargs = {
            "title": {"required": False},
            "summary": {"required": False},
            "body": {"required": False},
            "cover_image": {"required": False},
        }
