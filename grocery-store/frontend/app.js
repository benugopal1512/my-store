// CHANGE THIS TO YOUR LIVE RENDER URL
const BACKEND_URL = "https://my-store-c40u.onrender.com";
const API_BASE = `${BACKEND_URL}/api`;

let storeCatalog = [];
let basketItems = [];
let activeCategory = "all";
let activeOrderFilter = "all";
let allOrders = [];

// --- Toast helper (replaces alert()) ---
let toastTimer;
function showToast(message, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
}

// --- 1. Authentication UI Toggle ---
function toggleAuthMode(isRegisterMode) {
  const loginWrapper = document.getElementById('login-form-wrapper');
  const registerWrapper = document.getElementById('register-form-wrapper');
  const heading = document.getElementById('auth-heading');
  const eyebrow = document.getElementById('auth-eyebrow');
  const subtitle = document.getElementById('auth-subtitle');

  if (isRegisterMode) {
    loginWrapper.classList.add('hidden');
    registerWrapper.classList.remove('hidden');
    eyebrow.innerText = "Join us";
    heading.innerText = "Create your account";
    subtitle.innerText = "Set up a profile with a unique username.";
  } else {
    registerWrapper.classList.add('hidden');
    loginWrapper.classList.remove('hidden');
    eyebrow.innerText = "Welcome back";
    heading.innerText = "Sign in to your basket";
    subtitle.innerText = "Browse today's harvest or manage the store.";
  }
}

// --- Modal Controls ---
function showOrderModal() {
  if (basketItems.length === 0) return showToast("Your basket is empty!", true);
  document.getElementById('order-modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('order-modal').classList.add('hidden');
}

// --- Cart sidebar open/close ---
function openCart() {
  document.getElementById('cart-sidebar').classList.add('open');
  document.getElementById('cart-overlay').classList.remove('hidden');
}
function closeCart() {
  document.getElementById('cart-sidebar').classList.remove('open');
  document.getElementById('cart-overlay').classList.add('hidden');
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
      showToast("Account created! You can now sign in.");
      document.getElementById('reg-username').value = '';
      document.getElementById('reg-password').value = '';
      toggleAuthMode(false);
    } else {
      showToast(`Registration failed: ${data.message}`, true);
    }
  } catch (err) {
    showToast("Could not reach the registration server.", true);
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
      document.getElementById('user-badge').innerText = data.role.toUpperCase();

      if (data.role === 'admin') {
        document.getElementById('portal-title').innerText = "FreshBasket Console";
        document.getElementById('view-admin').classList.remove('hidden');
        setupOrderFilterHandlers();
        loadAdminOrdersStream();
      } else {
        document.getElementById('portal-title').innerText = "FreshBasket";
        document.getElementById('view-customer').classList.remove('hidden');
        document.getElementById('cart-fab').classList.remove('hidden');
        loadCustomerCatalog();
      }
    } else {
      showToast(`Access denied: ${data.message}`, true);
    }
  } catch (err) {
    showToast("Login failed. Check your connection or credentials.", true);
  }
}

// --- 4. Customer Catalog Storefront Management ---
async function loadCustomerCatalog() {
  const grid = document.getElementById('products-grid');
  try {
    const res = await fetch(`${API_BASE}/products`);
    storeCatalog = await res.json();
    renderCategoryChips();
    renderCatalogGrid(storeCatalog);
  } catch (e) {
    grid.innerHTML = "<p class='muted-note'>Couldn't connect to the store server. Please try again shortly.</p>";
  }
}

function renderCategoryChips() {
  const wrap = document.getElementById('category-chips');
  const categories = ["all", ...new Set(storeCatalog.map(p => p.category))];
  wrap.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'chip' + (cat === activeCategory ? ' active' : '');
    btn.innerText = cat === "all" ? "All items" : cat;
    btn.onclick = () => {
      activeCategory = cat;
      renderCategoryChips();
      filterCatalogSearch();
    };
    wrap.appendChild(btn);
  });
}

function renderCatalogGrid(items) {
  const grid = document.getElementById('products-grid');
  if (items.length === 0) {
    grid.innerHTML = '<p class="muted-note">No matching grocery items found.</p>';
    return;
  }

  grid.innerHTML = '';
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}" class="product-img" alt="${p.name}">
        <span class="product-stamp">${p.category}</span>
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="product-price">₹${p.price} <small>/ ${p.unit}</small></div>
        <button class="add-btn" onclick="addItemToBasket('${p._id}')">＋ Add to basket</button>
      </div>`;
    grid.appendChild(card);
  });
}

function filterCatalogSearch() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const matched = storeCatalog.filter(p => {
    const matchesQuery = p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    return matchesQuery && matchesCategory;
  });
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
  showToast(`Added ${target.name} to your basket`);
}

function changeQuantity(id, delta) {
  const item = basketItems.find(i => i.product._id === id);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    basketItems = basketItems.filter(i => i.product._id !== id);
  }
  updateBasketUI();
}

function updateBasketUI() {
  const box = document.getElementById('cart-items');
  const total = document.getElementById('cart-total');
  const fabCount = document.getElementById('cart-fab-count');
  const checkoutBtn = document.getElementById('checkout-btn');

  const itemCount = basketItems.reduce((acc, i) => acc + i.quantity, 0);
  fabCount.innerText = itemCount;
  checkoutBtn.disabled = basketItems.length === 0;

  if (basketItems.length === 0) {
    box.innerHTML = '<p class="muted-note">Your basket is empty.</p>';
    total.innerText = '₹0';
    return;
  }

  box.innerHTML = '';
  let totalSum = 0;
  basketItems.forEach(i => {
    totalSum += (i.product.price * i.quantity);
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <div class="cart-item-name">${i.product.name}</div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQuantity('${i.product._id}', -1)">−</button>
          <span class="cart-item-qty">${i.quantity}</span>
          <button class="qty-btn" onclick="changeQuantity('${i.product._id}', 1)">+</button>
        </div>
      </div>
      <span class="cart-item-price">₹${i.product.price * i.quantity}</span>`;
    box.appendChild(row);
  });
  total.innerText = `₹${totalSum}`;
}

// --- Checkout Modal Logic ---
async function confirmCheckout() {
  if (basketItems.length === 0) return showToast("Your basket is empty!", true);

  const customerName = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();
  const address = document.getElementById('cust-address').value.trim();
  const paymentMethod = document.getElementById('payment-method').value;

  if (!customerName || !phone || !address) {
    return showToast("Please fill in all delivery details.", true);
  }

  const sum = basketItems.reduce((acc, i) => acc + (i.product.price * i.quantity), 0);

  const payload = {
    customerName, phone, address, paymentMethod,
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
      showToast("Order placed! Fresh picks on the way.");
      basketItems = [];
      updateBasketUI();
      closeModal();
      closeCart();
      document.getElementById('cust-name').value = '';
      document.getElementById('cust-phone').value = '';
      document.getElementById('cust-address').value = '';
    } else {
      showToast("Something went wrong placing your order.", true);
    }
  } catch (err) {
    showToast("Network error while submitting your order.", true);
  }
}

// --- 6. Admin Dashboard Content Feed Pipelines ---
async function loadAdminOrdersStream() {
  const container = document.getElementById('orders-container');
  try {
    const res = await fetch(`${API_BASE}/orders`);
    allOrders = await res.json();
    renderAdminStats();
    renderOrdersList();
  } catch (e) {
    container.innerHTML = '<p class="muted-note">Could not load orders right now.</p>';
  }
}

function renderAdminStats() {
  const strip = document.getElementById('admin-stats');
  const pending = allOrders.filter(o => o.status === 'Pending').length;
  const delivered = allOrders.filter(o => o.status === 'Delivered').length;
  const revenue = allOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0);

  strip.innerHTML = `
    <div class="stat-card"><div class="stat-label">Total orders</div><div class="stat-value">${allOrders.length}</div></div>
    <div class="stat-card"><div class="stat-label">Pending</div><div class="stat-value">${pending}</div></div>
    <div class="stat-card"><div class="stat-label">Delivered</div><div class="stat-value">${delivered}</div></div>
    <div class="stat-card"><div class="stat-label">Revenue</div><div class="stat-value">₹${revenue}</div></div>`;
}

function setupOrderFilterHandlers() {
  const wrap = document.getElementById('order-filter');
  wrap.querySelectorAll('.chip').forEach(btn => {
    btn.onclick = () => {
      wrap.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeOrderFilter = btn.dataset.filter;
      renderOrdersList();
    };
  });
}

function renderOrdersList() {
  const container = document.getElementById('orders-container');
  const orders = activeOrderFilter === 'all' ? allOrders : allOrders.filter(o => o.status === activeOrderFilter);

  if (orders.length === 0) {
    container.innerHTML = '<p class="muted-note">No orders in this view yet.</p>';
    return;
  }

  container.innerHTML = '';
  orders.forEach(o => {
    const isDone = o.status === 'Delivered';
    let itemsLines = '';
    o.items.forEach(i => {
      itemsLines += `<div class="item-row"><span>${i.name} (x${i.quantity})</span><span>₹${Number(i.price || 0) * i.quantity}</span></div>`;
    });

    const card = document.createElement('div');
    card.className = `order-card ${isDone ? 'delivered' : ''}`;
    card.innerHTML = `
      <div class="order-header">
        <span>#${o._id.slice(-6)}</span>
        <span class="status-badge status-${o.status}">${o.status}</span>
      </div>
      <p class="order-meta"><strong>${o.customerName}</strong> · ${o.phone}</p>
      <p class="order-meta">${o.address}</p>
      <div class="items-box">${itemsLines}</div>
      <div class="order-footer">
        ${!isDone ? `<button class="mark-delivered-btn" onclick="processOrderDelivery('${o._id}')">Mark delivered</button>` : '<span class="muted-note">Dispatched</span>'}
        <span class="order-total">₹${o.totalAmount}</span>
      </div>`;
    container.appendChild(card);
  });
}

async function processOrderDelivery(id) {
  try {
    const res = await fetch(`${API_BASE}/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Delivered' })
    });
    if (res.ok) {
      showToast("Order marked as delivered");
      loadAdminOrdersStream();
    }
  } catch (err) {
    showToast("Failed to update order status.", true);
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
      showToast(`${name} published to storefront`);
      document.getElementById('add-product-form').reset();
    }
  } catch (err) {
    showToast("Could not add the new item.", true);
  }
}

// --- 7. Session Disconnect ---
function triggerSessionLogout() {
  location.reload();
}