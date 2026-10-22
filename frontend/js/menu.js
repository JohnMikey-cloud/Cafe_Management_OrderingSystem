let menu = [];
let cart = {};
let activeCategory = "All";

// Must match the address of your Spring Boot backend.
const MENU_API = "http://localhost:8080/api/menu";

async function init() {
  renderModeBadge();
  setupUserPermissions();
  try {
    menu = await Api.getMenu();
    renderFilters();
    renderMenu();
    renderCart();
    loadCustomerReceipts();

    // Auto-refresh receipts and menu every 5 seconds
    setInterval(loadCustomerReceipts, 5000);
    setInterval(refreshMenu, 5000);
  } catch (err) {
    document.getElementById("menuGrid").innerHTML =
      '<p class="empty">Could not load the menu. Is the server running?<br><small>' + esc(err.message) + "</small></p>";
  }
}

function setupUserPermissions() {
  const currentUser = Auth.current();
  if (!currentUser) return;

  const nameInput = document.getElementById("customerName");
  if (nameInput) {
    nameInput.value = currentUser.name;
  }

  const adminSection = document.getElementById("adminMenuSection");
  if (adminSection && currentUser.role.toLowerCase() === "admin") {
    adminSection.style.display = "block";
  }
}

/* ---------- Saving to the backend ---------- */

// Sends JSON to the backend. Throws an Error with a readable message on failure.
async function sendToServer(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error("Server said " + res.status + " when saving the menu item.");
  }
  return res.json();
}

// Reloads the menu from the database so customers see changes without refreshing.
async function refreshMenu() {
  try {
    const fresh = await Api.getMenu();
    if (JSON.stringify(fresh) === JSON.stringify(menu)) return;
    menu = fresh;

    // Remove cart items that were deleted or went out of stock
    Object.keys(cart).forEach(id => {
      const m = menu.find(x => x.id === Number(id));
      if (!m || !m.available) delete cart[id];
    });

    renderFilters();
    renderMenu();
    renderCart();
  } catch (e) {
    console.error("Menu refresh failed:", e);
  }
}

/* ---------- Rendering ---------- */

function renderFilters() {
  const cats = ["All", ...new Set(menu.map(m => m.category))];
  const box = document.getElementById("filters");
  box.innerHTML = cats.map(c =>
    '<button class="chip ' + (c === activeCategory ? "active" : "") + '" data-cat="' + esc(c) + '">' + esc(c) + "</button>"
  ).join("");
  box.querySelectorAll(".chip").forEach(btn =>
    btn.addEventListener("click", () => { activeCategory = btn.dataset.cat; renderFilters(); renderMenu(); }));
}

function renderMenu() {
  const grid = document.getElementById("menuGrid");
  const items = menu.filter(m => activeCategory === "All" || m.category === activeCategory);
  const currentUser = Auth.current();
  const isAdmin = currentUser && currentUser.role.toLowerCase() === "admin";

  if (isAdmin) {
    // Admin View: Toggle stock availability
    grid.innerHTML = items.map(m => `
      <article class="card ${m.available ? "" : "soldout"}">
        <span class="cat">${esc(m.category)}</span>
        <h3>${esc(m.name)}</h3>
        <p class="price">${peso(m.price)}</p>
        <button class="btn ${m.available ? "ghost" : ""}" data-toggle-id="${m.id}" style="${m.available ? "border: 1px solid var(--bad); color: var(--bad);" : ""}">
          ${m.available ? "Mark as out of stock" : "Mark as available"}
        </button>
      </article>`).join("");

    grid.querySelectorAll("button[data-toggle-id]").forEach(btn =>
      btn.addEventListener("click", () => toggleItemAvailability(Number(btn.dataset.toggleId))));
  } else {
    // Customer View: Add to order
    grid.innerHTML = items.map(m => `
      <article class="card ${m.available ? "" : "soldout"}">
        <span class="cat">${esc(m.category)}</span>
        <h3>${esc(m.name)}</h3>
        <p class="price">${peso(m.price)}</p>
        <button class="btn" data-id="${m.id}" ${m.available ? "" : "disabled"}>
          ${m.available ? "Add to order" : "Sold out"}
        </button>
      </article>`).join("");

    grid.querySelectorAll("button[data-id]").forEach(btn =>
      btn.addEventListener("click", () => addToCart(Number(btn.dataset.id))));
  }
}

/* ---------- Admin actions ---------- */

async function toggleItemAvailability(id) {
  const item = menu.find(m => m.id === id);
  if (!item) return;

  const newValue = !item.available;
  try {
    // Saves the change to the database
    const saved = await sendToServer(MENU_API + "/" + id, "PUT", { ...item, available: newValue });
    item.available = saved && typeof saved.available === "boolean" ? saved.available : newValue;
  } catch (err) {
    showToast(err.message, true);
    return;
  }

  // If item is marked out of stock, remove it from current cart
  if (!item.available && cart[id]) {
    delete cart[id];
    renderCart();
  }

  renderMenu();
  showToast(`${item.name} is now ${item.available ? "available" : "out of stock"}.`);
}

async function handleAddMenuItem(event) {
  event.preventDefault();

  const nameInput = document.getElementById("itemNameInput");
  const priceInput = document.getElementById("itemPriceInput");
  const categoryInput = document.getElementById("itemCategorySelect");

  const itemName = nameInput.value.trim();
  const itemPrice = parseFloat(priceInput.value);
  const itemCategory = categoryInput.value;

  if (!itemName || isNaN(itemPrice)) {
    showToast("Please enter a valid item name and price.", true);
    return;
  }

  // No id here: the database creates it.
  const newItem = {
    name: itemName,
    price: itemPrice,
    category: itemCategory,
    available: true
  };

  try {
    // Saves to the database and returns the item with its real id
    const saved = await sendToServer(MENU_API, "POST", newItem);
    menu.push(saved);
  } catch (err) {
    showToast("Could not save the item. Is the server running? " + err.message, true);
    return;
  }

  renderFilters();
  renderMenu();

  document.getElementById("addMenuItemForm").reset();
  showToast(`Added ${itemName} to menu!`);
}

/* ---------- Cart ---------- */

function addToCart(id) { cart[id] = (cart[id] || 0) + 1; renderCart(); }

function changeQty(id, delta) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

function renderCart() {
  const list = document.getElementById("cartList");
  const ids = Object.keys(cart).map(Number);
  let total = 0;

  if (ids.length === 0) {
    list.innerHTML = '<p class="empty">Your order is empty.<br>Tap "Add to order" on a drink or pastry.</p>';
  } else {
    list.innerHTML = ids.map(id => {
      const m = menu.find(x => x.id === id);
      if (!m) return "";
      const sub = m.price * cart[id];
      total += sub;
      return `
        <div class="cart-row">
          <div><strong>${esc(m.name)}</strong><br><small>${peso(m.price)} each</small></div>
          <div class="qty">
            <button data-id="${id}" data-d="-1" aria-label="Remove one ${esc(m.name)}">\u2212</button>
            <span>${cart[id]}</span>
            <button data-id="${id}" data-d="1" aria-label="Add one ${esc(m.name)}">+</button>
          </div>
          <div class="sub">${peso(sub)}</div>
        </div>`;
    }).join("");
    list.querySelectorAll(".qty button").forEach(b =>
      b.addEventListener("click", () => changeQty(Number(b.dataset.id), Number(b.dataset.d))));
  }
  document.getElementById("cartTotal").textContent = peso(total);
  document.getElementById("placeBtn").disabled = ids.length === 0;
}

async function placeOrder(event) {
  event.preventDefault();
  const nameInput = document.getElementById("customerName");
  const name = nameInput.value.trim();
  if (!name) { showToast("Please enter the customer name.", true); nameInput.focus(); return; }

  const items = Object.keys(cart).map(id => ({ menuItemId: Number(id), quantity: cart[id] }));
  const btn = document.getElementById("placeBtn");
  btn.disabled = true;
  try {
    const order = await Api.placeOrder(name, items);
    showToast("Order #" + order.id + " placed for " + order.customerName + " \u2014 " + peso(order.total));
    cart = {};
    renderCart();
    loadCustomerReceipts();
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
  }
}

/* ---------- Receipts ---------- */

async function loadCustomerReceipts() {
  const user = Auth.current();
  if (!user) return;

  const section = document.getElementById("customerReceiptSection");
  const container = document.getElementById("receiptList");
  if (!section || !container) return;

  try {
    const allOrders = await Api.getOrders();
    const myOrders = allOrders.filter(o => o.customerName.toLowerCase() === user.name.toLowerCase());

    if (myOrders.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";
    container.innerHTML = myOrders.map(o => {
      const isPending = o.status === "PENDING";
      const isPreparingOrLater = ["PREPARING", "READY", "COMPLETED"].includes(o.status);

      return `
        <div class="receipt-card" style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:1rem; margin-top:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <strong>Order #${o.id}</strong>
            <span class="status s-${o.status}" style="font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:bold; background:#f1e8dc;">${o.status}</span>
          </div>
          <ul style="list-style:none; padding:0; margin:0.5rem 0; font-size:0.85rem;">
            ${o.items.map(i => `<li style="display:flex; justify-content:space-between;"><span>${i.quantity} \u00d7 ${esc(i.itemName)}</span> <span>${peso(i.unitPrice * i.quantity)}</span></li>`).join("")}
          </ul>
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--line); padding-top:0.5rem; margin-top:0.5rem; font-size:0.9rem;">
            <strong>Total: ${peso(o.total)}</strong>
            ${isPending ? `
              <button class="btn ghost cancel-order-btn" data-id="${o.id}" style="padding:0.25rem 0.6rem; font-size:0.8rem; border:1px solid var(--bad); color:var(--bad);">Cancel Order</button>
            ` : isPreparingOrLater ? `
              <small style="color:var(--muted); font-size:0.75rem; font-style:italic;">Preparing (Cannot Cancel)</small>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");

    container.querySelectorAll(".cancel-order-btn").forEach(btn => {
      btn.addEventListener("click", () => cancelCustomerOrder(Number(btn.dataset.id)));
    });
  } catch (e) {
    console.error("Error loading receipts:", e);
  }
}

async function cancelCustomerOrder(orderId) {
  try {
    await Api.setStatus(orderId, "CANCELLED");
    showToast(`Order #${orderId} has been cancelled.`);
    loadCustomerReceipts();
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ---------- Start ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const orderForm = document.getElementById("orderForm");
  const addMenuForm = document.getElementById("addMenuItemForm");

  if (orderForm) orderForm.addEventListener("submit", placeOrder);
  if (addMenuForm) addMenuForm.addEventListener("submit", handleAddMenuItem);

  init();
});