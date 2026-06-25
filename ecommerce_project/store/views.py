from django.shortcuts import render, redirect
from .models import Product, Cart, Order, Wishlist, Review
from django.db.models import Avg
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.models import Sum
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from django.db.models.functions import TruncMonth
import json
def signup(request):

    if request.method == 'POST':

        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']

        if User.objects.filter(username=username).exists():

            return render(
                request,
                'signup.html',
                {'error': 'Username already exists'}
            )

        User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        return redirect('/login/')

        

    return render(request, 'signup.html')


def user_login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']

        user = authenticate(
            request,
            username=username,
            password=password
        )

        if user:
            login(request, user)
            return redirect('/')

    return render(request, 'login.html')

def user_logout(request):
    logout(request)
    return redirect('/')

def home(request):

    search = request.GET.get('search')
    category = request.GET.get('category')

    products = Product.objects.all().order_by('-id')

    if search:
        products = products.filter(name__icontains=search)

    if category:
        products = products.filter(category=category)

    if request.user.is_authenticated:
        cart_count = Cart.objects.filter(user=request.user).count()
    else:
        cart_count = 0

    return render(request, 'home.html', {
        'products': products,
        'cart_count': cart_count
    })

@login_required
def product_detail(request, id):
    product = Product.objects.get(id=id)

    reviews = Review.objects.filter(product=product)

    avg_rating = Review.objects.filter(
        product=product
    ).aggregate(
        Avg('rating')
    )['rating__avg']

    if request.user.is_authenticated:
        cart_count = Cart.objects.filter(user=request.user).count()
    else:
        cart_count = 0

    return render(request, 'product_detail.html', {
        'product': product,
        'reviews': reviews,
        'avg_rating': avg_rating,
        'cart_count': cart_count
    })
@login_required
def add_to_cart(request, id):

    product = Product.objects.get(id=id)

    if product.stock <= 0:
        return redirect('/')

    cart_item, created = Cart.objects.get_or_create(
        user=request.user,
        product=product
    )

    if not created:
        cart_item.quantity += 1
        cart_item.save()

    return redirect('/cart/')
@login_required
def cart(request):
    cart_items = Cart.objects.filter(user=request.user)

    total = 0
    for item in cart_items:
        total += item.product.price * item.quantity

    discount = total * 0.10

    coupon = request.session.get('coupon')

    if coupon == "SAVE10":
        discount += total * 0.10

    elif coupon == "SAVE20":
        discount += total * 0.20

    elif coupon == "FIRST50":
        discount += 50

    final_total = total - discount
    cart_count = cart_items.count()

    return render(request, 'cart.html', {
        'cart_items': cart_items,
        'total': total,
        'discount': discount,
        'final_total': final_total,
        'cart_count': cart_count
    })

@login_required
def remove_cart(request, id):
    item = Cart.objects.get(id=id)
    item.delete()

    return redirect('/cart/')

@login_required
def increase(request, id):
    item = Cart.objects.get(id=id)
    item.quantity += 1
    item.save()

    return redirect('/cart/')

@login_required
def decrease(request, id):
    item = Cart.objects.get(id=id)

    if item.quantity > 1:
        item.quantity -= 1
        item.save()
    else:
        item.delete()

    return redirect('/cart/')
@login_required
def checkout(request):

    cart_items = Cart.objects.filter(user=request.user)

    for item in cart_items:
        Order.objects.create(
            user=request.user,
            product=item.product,
            quantity=item.quantity,
            total_price=item.product.price * item.quantity
        )
        item.product.stock -= item.quantity
        item.product.save()

    cart_items.delete()

    return redirect('/order-success/')
@login_required
def order_success(request):
    return render(request, 'order_success.html')
@login_required
def orders(request):

    orders = Order.objects.filter(
        user=request.user
    ).order_by('-created_at')

    return render(
        request,
        'orders.html',
        {'orders': orders}
    )
@login_required
def add_to_wishlist(request, id):

    product = Product.objects.get(id=id)

    Wishlist.objects.get_or_create(
        user=request.user,
        product=product
    )

    return redirect('/')

    return redirect('/')
@login_required
def wishlist(request):

    items = Wishlist.objects.filter(
        user=request.user
    )

    return render(
        request,
        'wishlist.html',
        {'items': items}
    )
@login_required
def add_review(request, id):

    if request.method == 'POST':
     
        product = Product.objects.get(id=id)

        rating = request.POST['rating']
        comment = request.POST['comment']

        Review.objects.create(
            user=request.user,
            product=product,
            rating=rating,
            comment=comment
        )

    return redirect(f'/product/{id}/')
@login_required
def remove_wishlist(request, id):
    item = Wishlist.objects.get(id=id)
    item.delete()

    return redirect('/wishlist/')
@login_required
def dashboard(request):

    total_products = Product.objects.count()
    total_orders = Order.objects.count()
    total_users = User.objects.count()

    recent_orders = Order.objects.order_by(
        '-created_at'
    )[:5]

    revenue = Order.objects.aggregate(
        Sum('total_price')
    )['total_price__sum'] or 0

    top_products = (
        Order.objects
        .values('product__name')
        .annotate(total_sold=Sum('quantity'))
        .order_by('-total_sold')[:5]
    )

    monthly_sales = (
        Order.objects
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total=Sum('total_price'))
        .order_by('month')
    )

    months = []
    sales = []

    for item in monthly_sales:
        if item['month']:
            months.append(item['month'].strftime("%b"))
        else:
            months.append('Unknown')
        sales.append(item['total'] or 0)

    context = {
        'total_products': total_products,
        'total_orders': total_orders,
        'total_users': total_users,
        'revenue': revenue,
        'recent_orders': recent_orders,
        'top_products': top_products,
       'months': json.dumps(months),
       'sales': json.dumps(sales),
    }

    return render(request, 'dashboard.html', context)

@login_required
def delete_product(request, id):
    product = Product.objects.get(id=id)
    product.delete()
    return redirect('/')
@login_required
def edit_product(request, id):
    product = Product.objects.get(id=id)

    if request.method == 'POST':
        product.name = request.POST.get('name')
        product.price = request.POST.get('price')
        product.stock = request.POST.get('stock')
        product.description = request.POST.get('description')
        product.image = request.POST.get('image')
        product.category = request.POST.get('category')

        product.save()

        return redirect('/')

    return render(request, 'edit_product.html', {
        'product': product
    })
@login_required
def add_product(request):

    if request.method == 'POST':

        Product.objects.create(
            name=request.POST['name'],
            price=request.POST['price'],
            stock=request.POST['stock'],
            description=request.POST['description'],
            image=request.POST['image'],
            category=request.POST['category']
        )

        return redirect('/')

    return render(request, 'add_product.html')
@login_required
def profile(request):

    return render(request, 'profile.html')
@login_required
def categories(request):
    return render(
        request,
        'categories.html'
    )

@login_required
def electronics(request):

    products = Product.objects.filter(
        category='Electronics'
    )

    brand = request.GET.get('brand')

    if brand:
        products = products.filter(
            brand__iexact=brand
        )

    return render(request,'home.html',{
        'products':products,
        'category':'Electronics'
    })
@login_required
def fashion(request):
    products = Product.objects.filter(category='Fashion')

    return render(request, 'home.html', {
        'products': products,
        'category': 'Fashion'
    })


@login_required
def beauty(request):
    products = Product.objects.filter(category='Beauty')

    return render(request, 'home.html', {
        'products': products,
        'category': 'Beauty'
    })


@login_required
def snacks(request):
    products = Product.objects.filter(category='Snacks')

    return render(request, 'home.html', {
        'products': products,
        'category': 'Snacks'
    })


@login_required
def payment_page(request):

    cart_items = Cart.objects.filter(user=request.user)

    total = 0

    for item in cart_items:
        total += item.product.price * item.quantity

    name = request.session.get('address_name')
    phone = request.session.get('phone')
    address = request.session.get('address')
    pincode = request.session.get('pincode')

    return render(request, 'payment.html', {
        'total': total,
        'name': name,
        'phone': phone,
        'address': address,
        'pincode': pincode,
    })

@login_required
def process_payment(request):

    if request.method == "POST":

        cart_items = Cart.objects.filter(
            user=request.user
        )

        for item in cart_items:

            Order.objects.create(
                user=request.user,
                product=item.product,
                quantity=item.quantity,
                total_price=item.product.price * item.quantity
            )

            item.product.stock -= item.quantity
            item.product.save()

        cart_items.delete()

        return redirect('/order-success/')

    return redirect('/payment/')
@login_required
def address_page(request):

    if request.method == "POST":

        request.session['address_name'] = request.POST['name']
        request.session['phone'] = request.POST['phone']
        request.session['address'] = request.POST['address']
        request.session['pincode'] = request.POST['pincode']

        return redirect('/payment/')

    return render(request, 'address.html')

def apply_coupon(request):
    if request.method == "POST":
        coupon = request.POST.get("coupon")
        request.session['coupon'] = coupon

    return redirect('cart')
@login_required
def update_order_status(request, id):

    order = get_object_or_404(Order, id=id)

    new_status = request.POST.get('status')

    order.status = new_status
    order.save()

    return redirect('/dashboard/')
@login_required
def download_invoice(request, id):

    order = Order.objects.get(id=id)

    response = HttpResponse(content_type='application/pdf')

    response['Content-Disposition'] = (
        f'attachment; filename="invoice_{order.id}.pdf"'
    )

    p = canvas.Canvas(response)

    p.setFont("Helvetica-Bold", 18)
    p.drawString(220, 800, "INVOICE")

    p.setFont("Helvetica", 12)

    p.drawString(50, 740, f"Order ID: {order.id}")
    p.drawString(50, 710, f"Customer: {order.user.username}")
    p.drawString(50, 680, f"Product: {order.product.name}")
    p.drawString(50, 650, f"Quantity: {order.quantity}")
    p.drawString(50, 620, f"Amount: Rs.{order.total_price}")
    p.drawString(50, 590, f"Status: {order.status}")

    p.drawString(50, 540, "Thank you for shopping with us!")

    p.showPage()
    p.save()

    return response