// Final Merged dashboard.js with Full-Dataset Search
// Includes: Modal handling, SweetAlerts, Pagination, Transaction ID refresh

// Global variables for search functionality
let allMembersData = [];
let allTransactionsData = [];
let currentMemberData = [];
let currentTransactionData = [];

// DOM Ready
document.addEventListener("DOMContentLoaded", function () {
  const username = localStorage.getItem("adminUsername") || "Admin";
  document.getElementById("username").textContent = username;

  setupSidebarButtons();
  setupFormSubmissions();
  renderRevenueChart();
  loadDashboardTables();
  setupTableActions(); // Add this line
  setupTableRowSelection(); // Add this line
});

// --- Modal Utilities ---
function openModalById(modalId) {
  const modalElem = document.getElementById(modalId);
  if (modalElem) {
    document.activeElement?.blur();
    let modalInstance = bootstrap.Modal.getInstance(modalElem);
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(modalElem);
    }
    modalInstance.show();
  }
}

function closeModalById(modalId) {
  const modalElem = document.getElementById(modalId);
  if (modalElem?.contains(document.activeElement)) {
    document.activeElement.blur();
  }
  const instance = bootstrap.Modal.getOrCreateInstance(modalElem);
  instance.hide();
}

// --- Sidebar Buttons ---
function setupSidebarButtons() {
  document.getElementById("register-btn")?.addEventListener("click", () => {
    openModalById("registerMemberModal");
  });

  document.getElementById("transaction-btn")?.addEventListener("click", () => {
    openModalById("transactionModal");
    populateTransactionForm();
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

// --- Form Submissions ---
function setupFormSubmissions() {
  const registerForm = document.getElementById("registerMemberForm");
  const transactionForm = document.getElementById("recordTransactionForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      formData.append("action", "register");

      try {
        const res = await fetch(
          "https://script.google.com/macros/s/AKfycbwS9r6xURHwfYyko3v80ZMLdQE5OpslvQINtGlRCGnQuiaR4gw-JsexFJuZdn2eMcYE/exec",
          { method: "POST", body: formData }
        );
        const result = await res.json();

        if (result.success) {
          Swal.fire("Success", result.message, "success");
          this.reset();
          generateMemberID();
          loadDashboardTables(); // Refresh tables
        } else {
          Swal.fire("Error", result.message, "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Network error occurred", "error");
      }
    });
  }

  if (transactionForm) {
    transactionForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      formData.append("action", "recordTransaction");

      try {
        const res = await fetch(
          "https://script.google.com/macros/s/AKfycbwS9r6xURHwfYyko3v80ZMLdQE5OpslvQINtGlRCGnQuiaR4gw-JsexFJuZdn2eMcYE/exec",
          { method: "POST", body: formData }
        );
        const result = await res.json();

        if (result.success) {
          Swal.fire("Success", result.message, "success");
          this.reset();
          populateTransactionForm(); // Regenerate ID
          loadDashboardTables(); // Refresh tables
        } else {
          Swal.fire("Error", result.message, "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Network error occurred", "error");
      }
    });
  }
}

// --- Chart ---
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
      scales: { y: { beginAtZero: true } },
    },
  });
}

// --- Table Loading + Pagination ---
async function loadDashboardTables() {
  await loadMembers();
  await loadTransactions();
}

async function loadMembers() {
  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwS9r6xURHwfYyko3v80ZMLdQE5OpslvQINtGlRCGnQuiaR4gw-JsexFJuZdn2eMcYE/exec?action=getMembers"
    );
    allMembersData = await res.json();
    currentMemberData = [...allMembersData]; // Initialize filtered data
    renderMemberPage(1);
    setupMemberSearch();
  } catch (err) {
    console.error("Failed to load members:", err);
    Swal.fire("Error", "Failed to load member data", "error");
  }
}

async function loadTransactions() {
  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwS9r6xURHwfYyko3v80ZMLdQE5OpslvQINtGlRCGnQuiaR4gw-JsexFJuZdn2eMcYE/exec?action=getTransactions"
    );
    allTransactionsData = await res.json();
    currentTransactionData = [...allTransactionsData]; // Initialize filtered data
    renderTransactionPage(1);
    setupTransactionSearch();
  } catch (err) {
    console.error("Failed to load transactions:", err);
    Swal.fire("Error", "Failed to load transaction data", "error");
  }
}

// --- Enhanced Search Functions ---
function setupMemberSearch() {
  const input = document.getElementById("memberSearch");
  input?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();

    currentMemberData = allMembersData.filter((member) => {
      // Safely handle all possible data types
      const memberId = String(member.memberId || "").toLowerCase();
      const fullName = String(member.fullName || "").toLowerCase();
      const phone = String(member.phone || "").toLowerCase();
      const address = String(member.address || "").toLowerCase();
      const regDate = new Date(member.registeredDate || "")
        .toLocaleDateString()
        .toLowerCase();

      return (
        memberId.includes(term) ||
        fullName.includes(term) ||
        phone.includes(term) ||
        address.includes(term) ||
        regDate.includes(term)
      );
    });

    renderMemberPage(1);
  });
}

function setupTransactionSearch() {
  const input = document.getElementById("transactionSearch");
  input?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();

    currentTransactionData = allTransactionsData.filter((transaction) => {
      // Safely handle all possible data types
      const transactionId = String(
        transaction.transactionId || ""
      ).toLowerCase();
      const memberId = String(transaction.memberId || "").toLowerCase();
      const address = String(transaction.address || "").toLowerCase();
      const amount = String(transaction.amount || "").toLowerCase();
      const purpose = String(transaction.paymentPurpose || "").toLowerCase();
      const transDate = new Date(transaction.transactionDate || "")
        .toLocaleDateString()
        .toLowerCase();

      return (
        transactionId.includes(term) ||
        memberId.includes(term) ||
        address.includes(term) ||
        amount.includes(term) ||
        purpose.includes(term) ||
        transDate.includes(term)
      );
    });

    renderTransactionPage(1);
  });
}

// --- Rendering Functions ---
function renderMemberPage(page) {
  const pageSize = 5;
  const totalPages = Math.ceil(currentMemberData.length / pageSize);
  const rows = paginateData(currentMemberData, pageSize, page);

  document.getElementById("member-table").innerHTML = rows
    .map(
      (member) => `
      <tr>
        <td>${member.memberId}</td>
        <td>${member.fullName}</td>
        <td>${member.phone}</td>
        <td>${member.address}</td>
        <td>${new Date(member.registeredDate).toLocaleDateString()}</td>
      </tr>`
    )
    .join("");

  renderPaginationControls(
    "member-pagination",
    page,
    totalPages,
    renderMemberPage
  );
}

function renderTransactionPage(page) {
  const pageSize = 5;
  const totalPages = Math.ceil(currentTransactionData.length / pageSize);
  const rows = paginateData(currentTransactionData, pageSize, page);

  document.getElementById("transaction-table").innerHTML = rows
    .map(
      (transaction) => `
      <tr>
        <td>${transaction.transactionId}</td>
        <td>${transaction.memberId}</td>
        <td>${transaction.address}</td>
        <td>₦${Number(transaction.amount).toLocaleString()}</td>
        <td>${transaction.paymentPurpose || ""}</td>
        <td>${new Date(transaction.transactionDate).toLocaleDateString()}</td>
      </tr>`
    )
    .join("");

  renderPaginationControls(
    "transaction-pagination",
    page,
    totalPages,
    renderTransactionPage
  );
}

// --- Helper Functions ---
function paginateData(data, pageSize, pageNumber) {
  const start = (pageNumber - 1) * pageSize;
  return data.slice(start, start + pageSize);
}

function renderPaginationControls(
  containerId,
  currentPage,
  totalPages,
  onPageChange
) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <button class="btn btn-sm btn-outline-secondary" ${
      currentPage === 1 ? "disabled" : ""
    } id="${containerId}-prev">Previous</button>
    <span>Page ${currentPage} of ${totalPages}</span>
    <button class="btn btn-sm btn-outline-secondary" ${
      currentPage === totalPages ? "disabled" : ""
    } id="${containerId}-next">Next</button>
  `;

  document
    .getElementById(`${containerId}-prev`)
    ?.addEventListener("click", () => onPageChange(currentPage - 1));
  document
    .getElementById(`${containerId}-next`)
    ?.addEventListener("click", () => onPageChange(currentPage + 1));
}

// --- Transaction Form Functions ---
function populateTransactionForm() {
  const txnId = document.getElementById("transactionId");
  const txnDate = document.getElementById("transactionDate");
  const recBy = document.getElementById("recordedBy");
  if (txnId) txnId.value = `TXN-${Date.now()}`;
  if (txnDate) txnDate.value = new Date().toLocaleString();
  if (recBy) recBy.value = localStorage.getItem("adminUsername") || "Admin";
}

async function generateMemberID() {
  try {
    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbwS9r6xURHwfYyko3v80ZMLdQE5OpslvQINtGlRCGnQuiaR4gw-JsexFJuZdn2eMcYE/exec?generateId=true"
    );
    const newId = await res.text();
    const idField = document.querySelector("input[name='memberId']");
    if (idField) idField.value = newId;
  } catch (err) {
    console.error("Failed to generate member ID:", err);
  }
}

// Add to your DOMContentLoaded or initialization function
function setupTableActions() {
  // Member table actions
  document
    .getElementById("printMembersBtn")
    ?.addEventListener("click", () =>
      printTable("member-table", "Registered Members")
    );
  document
    .getElementById("exportMembersBtn")
    ?.addEventListener("click", () =>
      exportToCSV(currentMemberData, "members")
    );

  // Transaction table actions
  document
    .getElementById("receiptBtn")
    ?.addEventListener("click", generateReceipt);
  document
    .getElementById("printTransactionsBtn")
    ?.addEventListener("click", () =>
      printTable("transaction-table", "Transaction Records")
    );
  document
    .getElementById("exportTransactionsBtn")
    ?.addEventListener("click", () =>
      exportToCSV(currentTransactionData, "transactions")
    );
}

// Print function
function printTable(tableId, title) {
  const printWindow = window.open("", "", "width=800,height=600");
  const table = document.getElementById(tableId);
  const tableClone = table.cloneNode(true);

  // Remove action buttons from print view
  tableClone.querySelectorAll(".no-print").forEach((el) => el.remove());

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial; margin: 20px; }
          h2 { color: #333; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          @media print {
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <h2>${title}</h2>
        <p>Generated on ${new Date().toLocaleString()}</p>
        ${tableClone.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Export to CSV function
function exportToCSV(data, fileName) {
  if (data.length === 0) {
    Swal.fire("Error", "No data to export", "error");
    return;
  }

  // Get headers
  const headers = Object.keys(data[0]);

  // Convert data to CSV
  let csv = headers.join(",") + "\n";

  data.forEach((row) => {
    const values = headers.map((header) => {
      let value = row[header];

      // Format dates
      if (header.toLowerCase().includes("date")) {
        value = new Date(value).toLocaleString();
      }

      // Handle amounts
      if (header === "amount") {
        value = `₦${Number(value).toLocaleString()}`;
      }

      // Escape quotes and wrap in quotes if contains comma
      value = String(value).replace(/"/g, '""');
      return `"${value}"`;
    });

    csv += values.join(",") + "\n";
  });

  // Create download link
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Receipt generation function
function generateReceipt() {
  const selectedRow = document.querySelector("#transaction-table tr.selected");
  if (!selectedRow) {
    Swal.fire("Error", "Please select a transaction first", "error");
    return;
  }

  const cells = selectedRow.querySelectorAll("td");
  const transactionData = {
    id: cells[0].textContent,
    memberId: cells[1].textContent,
    amount: cells[3].textContent,
    purpose: cells[4].textContent,
    date: cells[5].textContent,
  };

  const receiptWindow = window.open("", "", "width=400,height=600");
  receiptWindow.document.write(`
    <html>
      <head>
        <title>Payment Receipt</title>
        <style>
          body { font-family: Arial; margin: 20px; }
          .receipt { border: 1px solid #ddd; padding: 20px; max-width: 350px; }
          .header { text-align: center; margin-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #28a745; }
          .title { font-size: 18px; margin: 10px 0; }
          .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
          .detail { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="logo">COMMUNITY FINANCE</div>
            <div class="title">OFFICIAL RECEIPT</div>
          </div>
          <div class="divider"></div>
          <div class="detail">
            <span class="label">Receipt No:</span>
            <span>${transactionData.id}</span>
          </div>
          <div class="detail">
            <span class="label">Date:</span>
            <span>${transactionData.date}</span>
          </div>
          <div class="detail">
            <span class="label">Member ID:</span>
            <span>${transactionData.memberId}</span>
          </div>
          <div class="divider"></div>
          <div class="detail">
            <span class="label">Amount Received:</span>
            <span>${transactionData.amount}</span>
          </div>
          <div class="detail">
            <span class="label">Payment Purpose:</span>
            <span>${transactionData.purpose}</span>
          </div>
          <div class="divider"></div>
          <div class="footer">
            <p>Thank you for your payment</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
}

// Add row selection for receipts
function setupTableRowSelection() {
  document.querySelectorAll("#transaction-table tr").forEach((row) => {
    row.addEventListener("click", function () {
      document
        .querySelectorAll("#transaction-table tr")
        .forEach((r) => r.classList.remove("selected"));
      this.classList.add("selected");
    });
  });
}
