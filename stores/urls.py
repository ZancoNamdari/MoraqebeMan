from django.urls import path
from . import views

urlpatterns = [
    path('store-categories/',        views.StoreCategoryListView.as_view()),
    path('stores/',                  views.StoreListView.as_view()),
    path('stores/<int:pk>/',         views.StoreDetailView.as_view()),
    path('store/register/',          views.StoreRegisterView.as_view()),

    path('store/profile/',           views.MyStoreProfileView.as_view()),
    path('store/mine/',              views.MyStoresListView.as_view()),
    path('store/add/',               views.AddStoreView.as_view()),
    path('store/products/',          views.MyStoreProductsView.as_view()),
    path('store/products/<int:pk>/', views.MyStoreProductDetailView.as_view()),
    path('store/orders/',            views.StoreOrdersView.as_view()),
    path('store/orders/<int:pk>/action/',   views.StoreOrderActionView.as_view()),
    path('store/orders/<int:pk>/complete/', views.StoreOrderCompleteView.as_view()),

    path('orders/',                  views.CreateOrderView.as_view()),
    path('orders/mine/',             views.MyOrdersView.as_view()),
    path('orders/<int:pk>/cancel/',  views.CancelOrderView.as_view()),
]
