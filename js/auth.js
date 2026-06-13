// /js/auth.js


// Show alert if user is not admin and open the modal if access is granted
function notAdminAlert(modalId) {
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
function showLogin() {
  document.getElementById("admin-login-modal").style.display = "flex";
}

// Hide admin login modal
function closeLoginModal() {
  document.getElementById("admin-login-modal").style.display = "none";
}

// Handle admin login
function adminLogin() {
  const username = document.getElementById("admin-username").value;
  const password = document.getElementById("admin-password").value;

  const data = new URLSearchParams();
  data.append("action", "login"); // ✅ REQUIRED
  data.append("username", username);
  data.append("password", password);

  fetch(
    API_BASE_URL,
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
        setAdminSession(response.data ? response.data.token : "");
        localStorage.setItem("adminUsername", username);

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
function getAdminUsername() {
  return localStorage.getItem("adminUsername") || "Admin";
}

// Check if admin session is valid
function isAdminLoggedIn() {
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
function logoutAdmin() {
  // Show SweetAlert logout success
  Swal.fire({
    icon: "success",
    title: "Logout successful",
    showConfirmButton: false,
    timer: 1500,
  }).then(() => {
    // Perform cleanup after alert
    localStorage.removeItem("adminSession");
    localStorage.removeItem("adminUsername");
    sessionStorage.clear();

    // Redirect after cleanup
    window.location.href = "index.html";
  });
}

// Set admin session with expiration
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

function setAdminSession(token) {
  const session = {
    role: "admin",
    loginTime: Date.now(),
    expiresIn: SESSION_DURATION,
    token: token || ""
  };
  localStorage.setItem("adminSession", JSON.stringify(session));
}

function refreshAdminSessionOnActivity() {
  const activityEvents = ["click", "keydown", "mousemove", "scroll"];
  activityEvents.forEach((event) =>
    document.addEventListener(event, () => {
      const session = JSON.parse(localStorage.getItem("adminSession"));
      if (session) {
        session.loginTime = Date.now(); // ⏱ Refresh timestamp
        localStorage.setItem("adminSession", JSON.stringify(session));
      }
    })
  );
}

// Check if session expired and auto-logout
function checkSessionExpiry() {
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

