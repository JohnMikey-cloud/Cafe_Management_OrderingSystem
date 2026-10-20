// Logic for orders.html: the kitchen/counter queue.

const FLOW = { PENDING: "PREPARING", PREPARING: "READY", READY: "COMPLETED" };
const FLOW_LABEL = { PENDING: "Start preparing", PREPARING: "Mark ready", READY: "Mark completed" };
let allOrders = [];
let statusFilter = "ACTIVE";

async function loadOrders() {
  try {
    allOrders = await Api.getOrders();
    render();
  } catch (err) {
    document.getElementById("orderList").innerHTML =
      '<p class="empty">Could not load orders.<br><small>' + esc(err.message) + "</small></p>";
  }
}

function render() {
  // Safely retrieve logged-in user details
  const currentUser = typeof Auth !== "undefined" ? Auth.current() : null;
  const isAdmin = currentUser && currentUser.role && currentUser.role.toLowerCase() === "admin";

  const shown = allOrders.filter(o => {
    if (statusFilter === "ACTIVE") return ["PENDING", "PREPARING", "READY"].includes(o.status);
    if (statusFilter === "ALL") return true;
    return o.status === statusFilter;
  });

  const list = document.getElementById("orderList");
  if (shown.length === 0) {
    list.innerHTML = '<p class="empty">No orders here yet.</p>';
    return;
  }

  list.innerHTML = shown.map(o => `
    <article class="order">
      <header>
        <h3>#${o.id} \u00B7 ${esc(o.customerName)}</h3>
        <span class="status s-${o.status}">${o.status}</span>
      </header>
      <ul>${o.items.map(i => `<li>${i.quantity} \u00D7 ${esc(i.itemName)} <span>${peso(i.unitPrice * i.quantity)}</span></li>`).join("")}</ul>
      <footer>
        <strong>${peso(o.total)}</strong>
        <small>${new Date(o.createdAt).toLocaleString()}</small>
        ${isAdmin ? `
          <div class="actions">
            ${FLOW[o.status] ? `<button class="btn" data-id="${o.id}" data-next="${FLOW[o.status]}">${FLOW_LABEL[o.status]}</button>` : ""}
            ${["PENDING", "PREPARING"].includes(o.status) ? `<button class="btn ghost" data-id="${o.id}" data-next="CANCELLED">Cancel</button>` : ""}
          </div>
        ` : ""}
      </footer>
    </article>`).join("");

  if (isAdmin) {
    list.querySelectorAll("button[data-id]").forEach(b =>
      b.addEventListener("click", () => advance(Number(b.dataset.id), b.dataset.next)));
  }
}

async function advance(id, next) {
  try {
    await Api.setStatus(id, next);
    showToast("Order #" + id + " is now " + next);
    loadOrders();
  } catch (err) {
    showToast(err.message, true);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderModeBadge();
  document.querySelectorAll("#statusFilters .chip").forEach(chip =>
    chip.addEventListener("click", () => {
      statusFilter = chip.dataset.status;
      document.querySelectorAll("#statusFilters .chip").forEach(c => c.classList.toggle("active", c === chip));
      render();
    }));
  loadOrders();
  setInterval(loadOrders, 5000);   // Refresh every 5 seconds
});