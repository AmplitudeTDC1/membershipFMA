document.addEventListener("DOMContentLoaded", function () {
  // Initialize Materialize components
  M.AutoInit();

  // Populate admin username
  const username = localStorage.getItem("adminUsername") || "Admin";
  document.getElementById("username").textContent = username;

  // Attach sidebar button handlers
  setupSidebarButtons();

  // Setup form submission handlers
  setupFormSubmissions();

  // Initialize Revenue Chart
  renderRevenueChart();
});

// Utility: Open a modal by ID
function openModalById(modalId) {
  const modalElem = document.getElementById(modalId);
  const modalInstance = M.Modal.getInstance(modalElem);
  if (modalInstance) {
    modalInstance.open();
  }
}

// Utility: Close a modal by ID
function closeModalById(modalId) {
  const modalElem = document.getElementById(modalId);
  const modalInstance = M.Modal.getInstance(modalElem);
  if (modalInstance) {
    modalInstance.close();
  }
}

// Setup sidebar button click events
function setupSidebarButtons() {
  document
    .getElementById("register-btn")
    ?.addEventListener("click", function () {
      openModalById("registerMemberModal");
    });

  document
    .getElementById("transaction-btn")
    ?.addEventListener("click", function () {
      openModalById("recordTransactionModal");
    });

  document.getElementById("logout-btn")?.addEventListener("click", function () {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

// Setup form submissions
function setupFormSubmissions() {
  const registerForm = document.getElementById("registerForm");
  const transactionForm = document.getElementById("transactionForm");

  if (registerForm) {
    registerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      M.toast({ html: "Member registered successfully!" });
      closeModalById("registerMemberModal");
      this.reset();
    });
  }

  if (transactionForm) {
    transactionForm.addEventListener("submit", function (e) {
      e.preventDefault();
      M.toast({ html: "Transaction recorded successfully!" });
      closeModalById("recordTransactionModal");
      this.reset();
    });
  }
}

// Render revenue chart using Chart.js
function renderRevenueChart() {
  const ctx = document.getElementById("revenueChart")?.getContext("2d");
  if (!ctx) return;

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      datasets: [
        {
          label: "Revenue (₦)",
          data: [50000, 70000, 40000, 90000, 65000, 75000],
          backgroundColor: "rgba(33, 150, 243, 0.5)",
          borderColor: "rgba(33, 150, 243, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}
