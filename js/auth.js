// /js/auth.js

// Show alert if user is not admin and open the modal if access is granted
export function notAdminAlert(modalId) {
  if (!isAdminLoggedIn()) {
    Swal.fire({
      icon: "warning",
      title: "Access Denied",
      text: "You can only carry out this function when signed in as an admin",
    });
    document.getElementById("admin-login-modal").style.display = "flex";
  } else {
    Swal.fire("Access granted", "Opening form...", "success").then(() => {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "block";
      } else {
        console.warn(`Modal with ID '${modalId}' not found.`);
      }
    });
  }
}

// Show admin login modal
export function showLogin() {
  document.getElementById("admin-login-modal").style.display = "flex";
}

// Hide admin login modal
export function closeLoginModal() {
  document.getElementById("admin-login-modal").style.display = "none";
}

// Handle admin login
export function adminLogin() {
  const username = document.getElementById("admin-username").value;
  const password = document.getElementById("admin-password").value;

  const data = new URLSearchParams();
  data.append("username", username);
  data.append("password", password);

  fetch(
    "https://script.google.com/macros/s/AKfycbwS9r6xURHwfYyko3v80ZMLdQE5OpslvQINtGlRCGnQuiaR4gw-JsexFJuZdn2eMcYE/exec",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: data.toString(),
    }
  )
    .then((res) => res.json())
    .then((response) => {
      if (response.success) {
        setAdminSession();
        localStorage.setItem("adminUsername", username); // Optional display

        Swal.fire({
          icon: "success",
          title: "Login successful",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = "dashboard.html";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Login failed",
          text: response.message,
        });
      }
    })
    .catch((err) => {
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Could not connect to server",
      });
      console.error(err);
    });
}

// Get stored admin username (optional)
export function getAdminUsername() {
  return localStorage.getItem("adminUsername") || "Admin";
}

// Check if admin session is valid
export function isAdminLoggedIn() {
  try {
    const sessionData = JSON.parse(localStorage.getItem("adminSession"));
    if (!sessionData) return false;
    const { loginTime, expiresIn } = sessionData;
    return Date.now() <= loginTime + expiresIn;
  } catch (e) {
    console.error("Error parsing session data:", e);
    return false;
  }
}

// Logout admin
export function logoutAdmin() {
  localStorage.removeItem("adminSession");
  localStorage.removeItem("adminUsername");
  sessionStorage.clear();

  // Immediately redirect after cleanup
  window.location.href = "index.html";
}

// Set admin session with expiration
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export function setAdminSession() {
  const session = {
    role: "admin",
    loginTime: Date.now(),
    expiresIn: SESSION_DURATION,
  };
  localStorage.setItem("adminSession", JSON.stringify(session));
}

// Check if session expired and auto-logout
export function checkSessionExpiry() {
  try {
    const sessionData = JSON.parse(localStorage.getItem("adminSession"));
    if (sessionData) {
      const { loginTime, expiresIn } = sessionData;
      if (Date.now() > loginTime + expiresIn) {
        logoutAdmin();
      }
    }
  } catch (e) {
    console.error("Session check failed:", e);
  }
}

// Optional: Call this at regular intervals
setInterval(checkSessionExpiry, 60 * 1000); // Check every minute
