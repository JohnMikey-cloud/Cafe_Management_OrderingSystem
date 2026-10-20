// Authentication & Access Control for Brew & Co.
const Auth = (() => {
  const KEY = "cafe_user";
  const USERS_KEY = "registered_cafe_users";

  const SYSTEM_ACCOUNTS = [
    {
      role: 'Admin',
      username: 'admin',
      password: 'admin123',
      name: 'System Admin'
    }
  ];

  function getAccounts() {
    try {
      const stored = JSON.parse(localStorage.getItem(USERS_KEY));
      return stored && Array.isArray(stored) ? [...SYSTEM_ACCOUNTS, ...stored] : SYSTEM_ACCOUNTS;
    } catch (e) {
      return SYSTEM_ACCOUNTS;
    }
  }

  function read(store) {
    try { return JSON.parse(store.getItem(KEY)); } catch (e) { return null; }
  }

  function current() {
    return read(sessionStorage) || read(localStorage);
  }

  function login(username, password, keep) {
    const name = String(username || "").trim().toLowerCase();
    const accounts = getAccounts();
    const account = accounts.find(a => a.username === name && a.password === password);
    if (!account) return null;
    
    const user = { username: account.username, name: account.name, role: account.role };
    try {
      (keep ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(user));
    } catch (e) {}
    return user;
  }

  function register(name, username, password) {
    const cleanUser = String(username || "").trim().toLowerCase();
    const accounts = getAccounts();

    if (accounts.some(a => a.username === cleanUser)) {
      throw new Error("Username already exists.");
    }

    const newUser = {
      name: name.trim(),
      username: cleanUser,
      password: password,
      role: 'Customer'
    };

    try {
      const savedClients = JSON.parse(localStorage.getItem(USERS_KEY)) || [];
      savedClients.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(savedClients));
    } catch (e) {}

    return newUser;
  }

  function logout() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.replace("login.html");
  }

  return {
    current,
    login,
    register,
    logout,
    get accounts() { return getAccounts(); }
  };
})();

(function () {
  const path = location.pathname.split("/").pop();
  const onLoginPage = /login\.html$/.test(path);
  const user = Auth.current();

  // 1) Redirect unauthenticated users back to login
  if (!onLoginPage && !user) {
    document.documentElement.style.visibility = "hidden";
    location.replace("login.html?next=" + encodeURIComponent(path || "index.html"));
    return;
  }

  // 2) Block regular Customers from accessing orders.html, but ALLOW Admin
  if (path === "orders.html" && user && user.role.toLowerCase() !== "admin") {
    location.replace("index.html");
    return;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const bar = document.querySelector(".topbar");
    if (onLoginPage || !user || !bar) return;

    // Show Order Queue link in header ONLY for Admin users
    const navOrderQueue = document.getElementById("navOrderQueue");
    if (navOrderQueue) {
      if (user.role.toLowerCase() === "admin") {
        navOrderQueue.style.display = "inline-block";
      } else {
        navOrderQueue.style.display = "none";
      }
    }

    const style = document.createElement("style");
    style.textContent =
      ".userbox{display:flex;align-items:center;gap:.6rem;color:#e9dccd;font-size:.9rem}" +
      ".userbox button{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.45);" +
      "border-radius:8px;padding:.3rem .75rem;font:inherit;cursor:pointer}" +
      ".userbox button:hover{background:rgba(255,255,255,.14)}";
    document.head.appendChild(style);

    const box = document.createElement("div");
    box.className = "userbox";
    const label = document.createElement("span");
    label.textContent = `${user.name} (${user.role})`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Log out";
    btn.addEventListener("click", Auth.logout);
    box.appendChild(label);
    box.appendChild(btn);
    bar.appendChild(box);
  });
})();