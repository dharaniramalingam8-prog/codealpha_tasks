from django.urls import path
from . import views

urlpatterns = [

    path('', views.home, name='home'),

    path('signup/', views.signup, name='signup'),
    path('login/', views.user_login, name='login'),
    path('logout/', views.user_logout, name='logout'),

    path('product/<int:id>/', views.product_detail, name='product_detail'),

    path('add-to-cart/<int:id>/', views.add_to_cart, name='add_to_cart'),
    path('cart/', views.cart, name='cart'),
    path('remove-cart/<int:id>/', views.remove_cart, name='remove_cart'),

    path('increase/<int:id>/', views.increase, name='increase'),
    path('decrease/<int:id>/', views.decrease, name='decrease'),

    path('checkout/', views.checkout, name='checkout'),
    path('order-success/', views.order_success, name='order_success'),
    path('orders/', views.orders, name='orders'),

    path('add-to-wishlist/<int:id>/', views.add_to_wishlist, name='add_to_wishlist'),
    path('wishlist/', views.wishlist, name='wishlist'),
    path('remove-wishlist/<int:id>/', views.remove_wishlist, name='remove_wishlist'),

    path('add-review/<int:id>/', views.add_review, name='add_review'),

    path('dashboard/', views.dashboard, name='dashboard'),

    path('add-product/', views.add_product, name='add_product'),
    path('edit-product/<int:id>/', views.edit_product, name='edit_product'),
    path('delete-product/<int:id>/', views.delete_product, name='delete_product'),

    path('profile/', views.profile, name='profile'),
]