from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from store import views
from store.views import (
    home,
    product_detail,
    add_to_cart,
    cart,
    remove_cart,
    increase,
    decrease,
    checkout,
    order_success,
    signup,
    user_login,
    user_logout,
    orders,
    wishlist,
    add_to_wishlist,
    add_review,
    remove_wishlist,
    dashboard,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    path('', home, name='home'),

    path('product/<int:id>/', product_detail, name='product_detail'),

    path('add-to-cart/<int:id>/', add_to_cart, name='add_to_cart'),

    path('cart/', cart, name='cart'),

    path('remove-cart/<int:id>/', remove_cart, name='remove_cart'),
    path('increase/<int:id>/', increase, name='increase'),
    path('decrease/<int:id>/', decrease, name='decrease'),
    path('checkout/', checkout, name='checkout'),
    path('order-success/', order_success, name='order_success'),
    path('signup/', signup, name='signup'),
    path('login/', user_login, name='login'),
    path('logout/', user_logout, name='logout'),
    path('orders/', orders, name='orders'),
    path('wishlist/', wishlist, name='wishlist'),
    path('add-to-wishlist/<int:id>/', add_to_wishlist, name='add_to_wishlist'),
    path('add-review/<int:id>/', add_review,name='add_review'),
    path('remove-wishlist/<int:id>/',remove_wishlist,name='remove_wishlist'),
    path('dashboard/', dashboard),
    path('add-product/', views.add_product, name='add_product'),
    path('delete-product/<int:id>/',views.delete_product),
    path('edit-product/<int:id>/',views.edit_product),
    path('profile/', views.profile, name='profile'),
    path('checkout/', views.checkout, name='checkout'),
    path('electronics/', views.electronics, name='electronics'),
    path('fashion/', views.fashion, name='fashion'),
    path('beauty/', views.beauty, name='beauty'),
    path('snacks/', views.snacks, name='snacks'),
    path('categories/', views.categories),
    path('payment/', views.payment_page, name='payment'),
    path('process-payment/', views.process_payment, name='process_payment'),
    path('address/', views.address_page, name='address'),
    path('apply-coupon/',views.apply_coupon,name='apply_coupon'), 
    path('update-order-status/<int:id>/',views.update_order_status,name='update_order_status'),
    path('invoice/<int:id>/',views.download_invoice,name='download_invoice'),
]
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )