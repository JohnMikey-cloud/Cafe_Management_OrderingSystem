function nextPage() {
  const next = new URLSearchParams(location.search).get("next");
  return next && /^[\w-]+\.html$/.test(next) && next !== "login.html" ? next : "index.html";
}

document.addEventListener("DOMContentLoaded", () => {
  if (Auth.current()) { 
    location.replace(nextPage()); 
    return; 
  }

  const tabLogin = document.getElementById("tabLogin");
  const tabSignup = document.getElementById("tabSignup");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  const username = document.getElementById("username");
  const password = document.getElementById("password");
  const keep = document.getElementById("keep");
  const loginError = document.getElementById("loginError");
  const signupError = document.getElementById("signupError");
  const toggle = document.getElementById("togglePw");

  // Tab switching between Log in and Sign up
  if (tabLogin && tabSignup) {
    tabLogin.addEventListener("click", () => {
      loginForm.style.display = "block";
      signupForm.style.display = "none";
      tabLogin.style.color = "var(--accent)";
      tabSignup.style.color = "var(--muted)";
    });

    tabSignup.addEventListener("click", () => {
      loginForm.style.display = "none";
      signupForm.style.display = "block";
      tabSignup.style.color = "var(--accent)";
      tabLogin.style.color = "var(--muted)";
    });
  }

  function showError(element, message) {
    if (element) {
      element.textContent = message;
      element.hidden = false;
    }
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const show = password.type === "password";
      password.type = show ? "text" : "password";
      toggle.textContent = show ? "Hide" : "Show";
    });
  }

  // Handle Login Submit
  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault(); 
      if (loginError) loginError.hidden = true;

      if (!username.value.trim() || !password.value) {
        showError(loginError, "Please enter your username and password.");
        return;
      }

      const user = Auth.login(username.value, password.value, keep ? keep.checked : false);
      if (!user) {
        showError(loginError, "Wrong username or password. Please try again.");
        password.value = "";
        return;
      }

      window.location.href = nextPage();
    });
  }

  // Handle Client Sign Up Submit
  if (signupForm) {
    signupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (signupError) signupError.hidden = true;

      const name = document.getElementById("signupName").value;
      const user = document.getElementById("signupUser").value;
      const pass = document.getElementById("signupPass").value;

      if (!name.trim() || !user.trim() || !pass) {
        showError(signupError, "All fields are required.");
        return;
      }

      try {
        Auth.register(name, user, pass);
        Auth.login(user, pass, false);
        window.location.href = nextPage();
      } catch (err) {
        showError(signupError, err.message);
      }
    });
  }

  if (username) username.focus();
});