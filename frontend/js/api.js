// Talks to either the real Java API or a browser-only mock using local storage.

const Api = (() => {
  const SEED_MENU = [
    { id: 1, name: "Espresso",          category: "Coffee",     price: 80,  available: true },
    { id: 2, name: "Americano",         category: "Coffee",     price: 95,  available: true },
    { id: 3, name: "Cafe Latte",        category: "Coffee",     price: 120, available: true },
    { id: 4, name: "Caramel Macchiato", category: "Coffee",     price: 140, available: true },
    { id: 5, name: "White Mocha Latte", category: "Coffee",     price: 140, available: true },
    { id: 6, name: "Iced Matcha Latte", category: "Non-Coffee", price: 130, available: true },
    { id: 7, name: "Hot Chocolate",     category: "Non-Coffee", price: 110, available: true },
    { id: 8, name: "Blueberry Muffin",  category: "Pastry",     price: 75,  available: true },
    { id: 9, name: "Butter Croissant",  category: "Pastry",     price: 85,  available: true }
  ];
  const STATUSES = ["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

  // Real API implementation
  async function http(path, options = {}) {
    const res = await fetch(CONFIG.API_BASE_URL.replace(/\/$/, "") + path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    if (!res.ok) {
      let msg = "Request failed (" + res.status + ")";
      try { const body = await res.json(); msg = body.error || body.message || msg; } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  }

  const real = {
    getMenu:   () => http("/api/menu"),
    getOrders: () => http("/api/orders"),
    placeOrder: (customerName, items) =>
      http("/api/orders", { method: "POST", body: JSON.stringify({ customerName, items }) }),
    setStatus: (id, status) =>
      http("/api/orders/" + id + "/status", { method: "PATCH", body: JSON.stringify({ status }) })
  };

  // Shared Browser Mock (localStorage)
  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  const mock = {
    getMenu: async () => load("cafe_menu", SEED_MENU),
    saveMenu: async (newMenu) => save("cafe_menu", newMenu),
    getOrders: async () =>
      load("cafe_orders", []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    placeOrder: async (customerName, items) => {
      const orders = load("cafe_orders", []);
      const currentMenu = load("cafe_menu", SEED_MENU);
      
      const lines = items.map(i => {
        const m = currentMenu.find(x => x.id === i.menuItemId);
        if (!m) throw new Error("Unknown menu item");
        return { menuItemId: m.id, itemName: m.name, unitPrice: m.price, quantity: i.quantity };
      });
      
      const order = {
        id: (orders.reduce((max, o) => Math.max(max, o.id), 0)) + 1,
        customerName,
        status: "PENDING",
        total: lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
        createdAt: new Date().toISOString(),
        items: lines
      };
      
      orders.push(order);
      save("cafe_orders", orders);
      return order;
    },
    setStatus: async (id, status) => {
      const orders = load("cafe_orders", []);
      const order = orders.find(o => o.id === id);
      if (!order) throw new Error("Order not found");
      if (!STATUSES.includes(status)) throw new Error("Invalid status");
      order.status = status;
      save("cafe_orders", orders);
      return order;
    }
  };

  return CONFIG.USE_MOCK ? mock : real;
})();

function peso(n) { return "\u20B1" + Number(n).toFixed(2); }

function esc(text) {
  const d = document.createElement("div");
  d.textContent = text;
  return d.innerHTML;
}

function showToast(message, isError) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = message;
  t.className = "toast show" + (isError ? " error" : "");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => (t.className = "toast"), 3500);
}

function renderModeBadge() {
  const b = document.getElementById("modeBadge");
  if (!b) return;
  b.textContent = CONFIG.USE_MOCK ? "Demo mode \u00B7 saved in this browser" : "Live \u00B7 connected to server";
  b.className = "badge " + (CONFIG.USE_MOCK ? "badge-demo" : "badge-live");
  const v = document.getElementById("version");
  if (v) v.textContent = CONFIG.VERSION;
}