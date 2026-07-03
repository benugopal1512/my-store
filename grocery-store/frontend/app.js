// CHANGE THIS TO YOUR LIVE RENDER URL LATER (e.g., "https://grocery-api.onrender.com")
const BACKEND_URL = "http://localhost:5000"; 
const API_BASE = `${BACKEND_URL}/api`;

let storeCatalog = [];
let basketItems = [];

// --- 1. Authentication UI Toggle ---
function toggleAuthMode(isRegisterMode) {
    const loginWrapper = document.getElementById('login-form-wrapper');
    const registerWrapper = document.getElementById('register-form-wrapper');
    const authSubtitle = document.getElementById('auth-subtitle');

    if (isRegisterMode) {
        loginWrapper.classList.add('hidden');
        registerWrapper.classList.remove('hidden');
        authSubtitle.innerText = "Register a brand new profile with unique credentials";
    } else {
        registerWrapper.classList.add('hidden');
        loginWrapper.classList.remove('hidden');
        authSubtitle.innerText = "Sign in to browse items or manage store orders";
    }
}

// --- NEW: Modal Controls ---
function showOrderModal() {
    if (basketItems.length === 0) return alert("Your basket is empty!");
    document.getElementById('order-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

// --- 2. Registration API Handler (Enforces Customer Role) ---
async function handleAuthRegister(event) {
    event.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    
    const role = "customer"; 

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });
        const data = await response.json();

        if (data.success) {
            alert("🎉 Account created successfully! You can now log in.");
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-password').value = '';
            toggleAuthMode(false); 
        } else {
            alert(`⚠️ Registration failed: ${data.message}`);
        }
    } catch (err) {
        alert("❌ Could not connect to authentication server registration streams.");
    }
}

// --- 3. Login API Handler & Session View Routing ---
async function handleAuthLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
        let response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        let data = await response.json();

        if (!data.success && username === 'admin' && password === 'benu1512') {
            const seedResponse = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password: 'benu1512', role: 'admin' })
            });
            const seedData = await seedResponse.json();

            if (seedData.success) {
                response = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                data = await response.json();
            }
        }

        if (data.success) {
            document.getElementById('auth-view').classList.add('hidden');
            document.getElementById('app-workspace').classList.remove('hidden');
            document.getElementById('user-badge').innerText = `👤 ${data.role.toUpperCase()}`;

            if (data.role === 'admin') {
                document.getElementById('portal-title').innerText = "⚙️ FreshBasket Management Console";
                document.getElementById('view-admin').classList.remove('hidden');
                loadAdminOrdersStream();
            } else {
                document.getElementById('portal-title').innerText = "🌿 FreshBasket Storefront";
                document.getElementById('view-customer').classList.remove('hidden');
                loadCustomerCatalog();
            }
        } else {
            alert(`❌ Access Denied: ${data.message}`);
        }
    } catch (err) {
        alert("❌ Login access denied. Please verify your connection or credentials.");
    }
}

// --- 4. Customer Catalog Storefront Management ---
async function loadCustomerCatalog() {
    const grid = document.getElementById('products-grid');
    try {
        const res = await fetch(`${API_BASE}/products`);
        storeCatalog = await res.json();
        renderCatalogGrid(storeCatalog);
    } catch (e) { 
        grid.innerHTML = "<p style='color:red;'>Failed connecting to database API server.</p>";
    }
}

function renderCatalogGrid(items) {
    const grid = document.getElementById('products-grid');
    if (items.length === 0) { 
        grid.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#7f8c8d;">No matching grocery items found.</div>'; 
        return; 
    }
    
    grid.innerHTML = '';
    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}" class="product-img">
            <div class="product-info">
                <div>
                    <span style="font-size:11px; font-weight:bold; color:#27ae60; background:#e8f8f0; padding:2px 8px; border-radius:10px;">${p.category}</span>
                    <h3 style="margin: 8px 0 4px 0; font-size:16px;">${p.name}</h3>
                </div>
                <div>
                    <div class="product-price">₹${p.price} <span style="font-size:12px; font-weight:normal; color:#7f8c8d;">/ ${p.unit}</span></div>
                    <button class="btn-action" style="padding:8px; font-size:13px; margin-top:5px;" onclick="addItemToBasket('${p._id}')">＋ Add to Basket</button>
                </div>
            </div>`;
        grid.appendChild(card);
    });
}

function filterCatalogSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const matched = storeCatalog.filter(p => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
    renderCatalogGrid(matched);
}

// --- 5. Basket (Cart) Core Utilities ---
function addItemToBasket(id) {
    const target = storeCatalog.find(p => p._id === id);
    const exists = basketItems.find(i => i.product._id === id);
    
    if (exists) {
        exists.quantity++;
    } else {
        basketItems.push({ product: target, quantity: 1 });
    }
    updateBasketUI();
}

function updateBasketUI() {
    const box = document.getElementById('cart-items');
    const total = document.getElementById('cart-total');
    
    if (basketItems.length === 0) { 
        box.innerHTML = 'Your basket is empty.'; 
        total.innerText = '₹0'; 
        return; 
    }
    
    box.innerHTML = '';
    let totalSum = 0;
    basketItems.forEach(i => {
        totalSum += (i.product.price * i.quantity);
        box.innerHTML += `
            <div class="cart-item">
                <span>🍏 <strong>${i.product.name}</strong> (x${i.quantity})</span>
                <span>₹${i.product.price * i.quantity}</span>
            </div>`;
    });
    total.innerText = `₹${totalSum}`;
}

// --- Checkout Modal Logic ---
// UPDATED: Now mapped to confirmCheckout logic
async function confirmCheckout() {
    if (basketItems.length === 0) return alert("Your cart basket is empty!");

    const customerName = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const address = document.getElementById('cust-address').value.trim();
    const paymentMethod = document.getElementById('payment-method').value;
    
    if (!customerName || !phone || !address) {
        return alert("⚠️ Please fill in all delivery details.");
    }

    const sum = basketItems.reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
    
    const payload = {
        customerName: customerName, 
        phone: phone, 
        address: address,
        paymentMethod: paymentMethod,
        items: basketItems.map(i => ({ name: i.product.name, quantity: i.quantity, price: Number(i.product.price) })),
        totalAmount: sum
    };
    
    try {
        const res = await fetch(`${API_BASE}/orders`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (res.ok) { 
            alert("🎉 Fresh Basket Order Placed Successfully!"); 
            basketItems = []; 
            updateBasketUI(); 
            closeModal();
        } else {
            alert("⚠️ Something went wrong processing your order.");
        }
    } catch (err) {
        alert("❌ Network error submitting your order.");
    }
}

// --- 6. Admin Dashboard Content Feed Pipelines ---
async function loadAdminOrdersStream() {
    const container = document.getElementById('orders-container');
    try {
        const res = await fetch(`${API_BASE}/orders`);
        const orders = await res.json();
        
        if (orders.length === 0) { 
            container.innerHTML = '<h4>No incoming dashboard orders recorded.</h4>'; 
            return; 
        }
        
        container.innerHTML = '';
        orders.forEach(o => {
            const isDone = o.status === 'Delivered';
            let itemsLines = '';
            o.items.forEach(i => {
                itemsLines += `<div class="item-row"><span>🍏 <strong>${i.name}</strong> (x${i.quantity})</span><span>₹${Number(i.price || 0) * i.quantity}</span></div>`;
            });
            
            container.innerHTML += `
                <div class="order-card ${isDone ? 'delivered' : ''}">
                    <div class="order-header"><span>🆔 Order ID: ${o._id}</span><span class="status-badge ${isDone?'status-delivered':'status-pending'}">${o.status}</span></div>
                    <p style="margin:5px 0; font-size:14px;"><strong>Customer:</strong> ${o.customerName} | <strong>Phone:</strong> ${o.phone}</p>
                    <p style="margin:5px 0; font-size:14px;"><strong>Address:</strong> ${o.address}</p>
                    <div style="background:#fafafa; padding:10px; border-radius:6px; margin:10px 0; border:1px solid #eee;">${itemsLines}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        ${!isDone ? `<button style="background:#27ae60; color:white; border:none; padding:8px 15px; font-weight:bold; border-radius:4px; cursor:pointer;" onclick="processOrderDelivery('${o._id}')">✅ Mark Delivered</button>` : '<span>✓ Dispatched</span>'}
                        <strong style="font-size:16px;">Total Bill: ₹${o.totalAmount}</strong>
                    </div>
                </div>`;
        });
    } catch(e) { 
        container.innerHTML = 'Error compiling order pipeline streams.'; 
    }
}

async function processOrderDelivery(id) {
    try {
        const res = await fetch(`${API_BASE}/orders/${id}/status`, { 
            method: 'PATCH', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ status: 'Delivered' }) 
        });
        if (res.ok) loadAdminOrdersStream();
    } catch (err) {
        alert("Failed to update product order status.");
    }
}

async function pushNewInventoryItem(event) {
    event.preventDefault();
    const name = document.getElementById('prod-name').value;
    const price = document.getElementById('prod-price').value;
    const unit = document.getElementById('prod-unit').value;
    const category = document.getElementById('prod-category').value;
    const image = document.getElementById('prod-image').value || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400";

    try {
        const res = await fetch(`${API_BASE}/products`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name, price, unit, category, image }) 
        });
        if (res.ok) { 
            alert(`✅ ${name} published to storefront successfully!`); 
            document.getElementById('add-product-form').reset(); 
        }
    } catch (err) {
        alert("Could not append new item data entry.");
    }
}

// --- 7. Session Disconnect ---
function triggerSessionLogout() {
    location.reload(); 
}