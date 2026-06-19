// Global variables for search functionality
function getSessionToken() {
  try {
    const session = JSON.parse(localStorage.getItem("adminSession"));
    return session ? session.token || "" : "";
  } catch (e) {
    console.error("Error getting session token:", e);
    return "";
  }
}

async function fetchPost(action, params = {}) {
  const token = getSessionToken();
  const bodyData = new URLSearchParams();
  bodyData.append("action", action);
  bodyData.append("token", token);
  for (const key in params) {
    bodyData.append(key, params[key]);
  }
  try {
    const res = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyData.toString(),
    });

    // Automatically redirect to login page if session is invalid or expired
    const resClone = res.clone();
    resClone.json().then((data) => {
      if (data && data.success === false && 
          (String(data.message).toLowerCase().includes("session") || 
           String(data.message).toLowerCase().includes("unauthorized"))) {
        localStorage.removeItem("adminSession");
        localStorage.removeItem("adminUsername");
        sessionStorage.clear();
        window.location.href = "index.html";
      }
    }).catch(() => {});

    return res;
  } catch (err) {
    console.error("fetchPost error:", err);
    throw err;
  }
}

let allMembersData = [];
let allTransactionsData = [];
let currentMemberData = [];
let currentTransactionData = [];
let historicalPaymentsData = [];
let historicalSortColumn = "fullName";
let historicalSortOrder = "asc";

// DOM Ready
document.addEventListener("DOMContentLoaded", function () {
  const username = localStorage.getItem("adminUsername") || "Admin";
  document.getElementById("username").textContent = username;

  setupModalFocusCleanup();
  setupSidebarButtons();
  setupFormSubmissions();
  loadDashboardTables();
  setupTableActions(); // Add this line
  setupTableRowSelection(); // Add this line
});

// --- Modal Utilities ---
function setupModalFocusCleanup() {
  document.querySelectorAll(".modal").forEach((modalElem) => {
    modalElem.addEventListener("hide.bs.modal", () => {
      if (modalElem.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    });
  });
}

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
    if (typeof window.generateMemberID === "function") {
      window.generateMemberID();
    }
    openModalById("registerMemberModal");
  });

  document.getElementById("transaction-btn")?.addEventListener("click", () => {
    openModalById("transactionModal");
    populateTransactionForm();
  });

  document.getElementById("broadcast-btn")?.addEventListener("click", () => {
    openModalById("broadcastModal");
    const broadcastContent = document.getElementById("broadcastContent");
    if (broadcastContent) broadcastContent.value = "";
  });

  document.getElementById("change-pass-btn")?.addEventListener("click", () => {
    openModalById("changePasswordModal");
    document.getElementById("changePasswordForm")?.reset();
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
  });
}

// --- Form Submissions ---
function setupFormSubmissions() {
  const registerForm = document.getElementById("registerMemberForm");
  const editMemberForm = document.getElementById("editMemberForm");
  const transactionForm = document.getElementById("recordTransactionForm");
  const broadcastForm = document.getElementById("broadcastMessageForm");
  const changePassForm = document.getElementById("changePasswordForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      
      const inputs = this.querySelectorAll("input, select, textarea, button");
      inputs.forEach(el => el.disabled = true);
      formData.append("action", "register");
      formData.append("token", getSessionToken());

      try {
        const res = await fetch(API_BASE_URL, {
          method: "POST",
          body: new URLSearchParams(formData),
        });
        const result = await res.json();

        if (result.success) {
          Swal.fire("Success", result.message, "success");
          this.reset();
          await loadDashboardTables(); // Refresh tables first
          generateMemberID(); // Then generate next member ID (+1)
        } else {
          Swal.fire("Error", result.message, "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Network error occurred", "error");
      } finally {
        inputs.forEach(el => el.disabled = false);
      }
    });
  }

  if (editMemberForm) {
    editMemberForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(this);
      formData.append("action", "updateMember");
      formData.append("token", getSessionToken());

      const inputs = this.querySelectorAll("input, select, textarea, button");
      inputs.forEach(el => el.disabled = true);

      try {
        const res = await fetch(API_BASE_URL, {
          method: "POST",
          body: new URLSearchParams(formData),
        });
        const result = await res.json();

        if (result.success) {
          Swal.fire("Success", result.message, "success");
          closeModalById("editMemberModal");
          await loadDashboardTables(); // Refresh tables
        } else {
          Swal.fire("Error", result.message, "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Network error occurred", "error");
      } finally {
        inputs.forEach(el => el.disabled = false);
      }
    });
  }

  if (transactionForm) {
    transactionForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(this);

      const inputs = this.querySelectorAll("input, select, textarea, button");
      inputs.forEach(el => el.disabled = true);
      formData.append("action", "recordTransaction");
      formData.append("token", getSessionToken());

      try {
        const res = await fetch(API_BASE_URL, {
          method: "POST",
          body: new URLSearchParams(formData),
        });
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
      } finally {
        inputs.forEach(el => el.disabled = false);
      }
    });
  }

  if (broadcastForm) {
    broadcastForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const content = document.getElementById("broadcastContent")?.value.trim();
      if (!content) {
        Swal.fire("Warning", "Please compose an announcement before sending.", "warning");
        return;
      }

      try {
        // Copy to clipboard
        await navigator.clipboard.writeText(content);

        // Fetch Settings from backend
        let groupLink = "";
        if (typeof window.getSettings === "function" && typeof window.getSettingValues === "function") {
          const settings = await window.getSettings();
          const groupLinks = window.getSettingValues(settings, ["whatsappGroupLink", "whatsappGroup", "groupLink", "whatsappLink"]);
          if (groupLinks && groupLinks.length) {
            groupLink = groupLinks[0];
          }
        }

        // Check if groupLink is valid
        if (!groupLink || !String(groupLink).startsWith("http")) {
          // If the link is not present in settings, use fallback and show warning
          groupLink = "https://web.whatsapp.com/";
          Swal.fire({
            title: "Announcement Copied!",
            text: "The announcement has been copied to your clipboard. Since no WhatsApp group link is configured in the Settings sheet, opening WhatsApp Web instead.",
            icon: "warning",
            confirmButtonText: "Open WhatsApp"
          }).then(() => {
            window.open(groupLink, "_blank");
            closeModalById("broadcastModal");
          });
        } else {
          Swal.fire({
            title: "Copied successfully!",
            text: "Announcement copied to clipboard. Opening the WhatsApp group...",
            icon: "success",
            showConfirmButton: false,
            timer: 2000
          }).then(() => {
            window.open(groupLink, "_blank");
            closeModalById("broadcastModal");
          });
        }
      } catch (err) {
        console.error("Clipboard copy failed:", err);
        Swal.fire("Error", "Could not copy text to clipboard. Please copy it manually.", "error");
      }
    });
  }

  if (changePassForm) {
    changePassForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const currentPassword = document.getElementById("currentPassword").value;
      const newPassword = document.getElementById("newPassword").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (newPassword !== confirmPassword) {
        Swal.fire("Warning", "New passwords do not match.", "warning");
        return;
      }

      if (newPassword.length < 6) {
        Swal.fire("Warning", "Password must be at least 6 characters.", "warning");
        return;
      }

      // Disable inputs and button
      const inputs = this.querySelectorAll("input, button");
      inputs.forEach(el => el.disabled = true);

      try {
        const res = await fetchPost("changePassword", {
          currentPassword: currentPassword,
          newPassword: newPassword
        });

        const result = await res.json();
        if (result.success) {
          Swal.fire({
            title: "Success!",
            text: "Password updated successfully! For security, you will now be logged out. Please sign in again with your new password.",
            icon: "success",
            confirmButtonText: "OK"
          }).then(() => {
            // Log out user
            localStorage.clear();
            window.location.href = "index.html";
          });
        } else {
          Swal.fire("Error", result.message || "Failed to update password.", "error");
          inputs.forEach(el => el.disabled = false);
        }
      } catch (err) {
        console.error("Change password request failed:", err);
        Swal.fire("Error", "Network error occurred. Please try again.", "error");
        inputs.forEach(el => el.disabled = false);
      }
    });
  }

  const createUserForm = document.getElementById("createUserForm");
  if (createUserForm) {
    console.log("Found createUserForm element, binding submit listener...");
    createUserForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("Create user form submit event fired!");
      const fullName = document.getElementById("newFullName").value.trim();
      const username = document.getElementById("newUsername").value.trim();
      const email = document.getElementById("newEmail").value.trim();
      const role = document.getElementById("newRole").value;
      const password = document.getElementById("createPassword").value;

      if (password.length < 6) {
        Swal.fire("Warning", "Password must be at least 6 characters.", "warning");
        return;
      }

      // Disable inputs and button
      const inputs = this.querySelectorAll("input, select, button");
      inputs.forEach(el => el.disabled = true);

      try {
        const res = await fetchPost("createUser", {
          fullName: fullName,
          username: username,
          email: email,
          role: role,
          password: password
        });

        const result = await res.json();
        if (result.success) {
          Swal.fire({
            title: "Success!",
            text: "User created successfully! The user must change their password on first login.",
            icon: "success",
            confirmButtonText: "OK"
          }).then(() => {
            this.reset();
            closeModalById("createUserModal");
          });
        } else {
          Swal.fire("Error", result.message || "Failed to create user.", "error");
        }
      } catch (err) {
        console.error("Create user request failed:", err);
        Swal.fire("Error", "Network error occurred. Please try again.", "error");
      } finally {
        inputs.forEach(el => el.disabled = false);
      }
    });
  }
}

// --- Chart ---
let revenueChartInstance = null;

function renderRevenueChart() {
  const ctx = document.getElementById("revenueChart")?.getContext("2d");
  if (!ctx) return;

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthlyData = new Array(12).fill(0);

  allTransactionsData.forEach((txn) => {
    if (txn.transactionDate) {
      const date = new Date(txn.transactionDate);
      if (!isNaN(date.getTime())) {
        const monthIndex = date.getMonth();
        monthlyData[monthIndex] += Number(txn.amount || 0);
      }
    }
  });

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  revenueChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: months,
      datasets: [
        {
          label: "Revenue (₦)",
          data: monthlyData,
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
          ticks: {
            callback: function (value) {
              return "₦" + value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

let streetChartInstance = null;

function renderStreetChart() {
  const ctx = document.getElementById("streetChart")?.getContext("2d");
  if (!ctx) return;

  const streetRevenue = {};

  allTransactionsData.forEach((txn) => {
    let street = "";

    const member = allMembersData.find((m) => m.memberId === txn.memberId);
    if (member && member.address) {
      const addressParts = member.address.trim().split(/\s+/);
      if (addressParts.length > 1 && /^\d+/.test(addressParts[0])) {
        street = addressParts.slice(1).join(" ");
      } else {
        street = member.address;
      }
    } else if (txn.address) {
      const addressParts = txn.address.trim().split(/\s+/);
      if (addressParts.length > 1 && /^\d+/.test(addressParts[0])) {
        street = addressParts.slice(1).join(" ");
      } else {
        street = txn.address;
      }
    }

    street = String(street || "Other").trim();
    const normalizedStreet = street.toLowerCase();
    let displayStreet = street;

    if (normalizedStreet.includes("fagbemi")) displayStreet = "Fagbemi Street";
    else if (normalizedStreet.includes("Fadoju"))
      displayStreet = "Fadoju Street ";
    else if (normalizedStreet.includes("Alhaji"))
      displayStreet = "Alhaji Aiyegbami Street";
    else if (normalizedStreet.includes("Godwin"))
      displayStreet = "Godwin Nwaemme Street ";
    else if (normalizedStreet.includes("Makanjuola"))
      displayStreet = "Makanjuola Street";
    else if (normalizedStreet.includes("Omolope"))
      displayStreet = "Omolope Close";
    else if (normalizedStreet.includes("Old")) displayStreet = "Old Ota Road";

    const amount = Number(txn.amount || 0);
    streetRevenue[displayStreet] = (streetRevenue[displayStreet] || 0) + amount;
  });

  const labels = Object.keys(streetRevenue);
  const data = Object.values(streetRevenue);

  if (labels.length === 0) {
    labels.push("No Data");
    data.push(0);
  }

  if (streetChartInstance) {
    streetChartInstance.destroy();
  }

  streetChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: [
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(201, 203, 207, 0.6)",
          ],
          borderColor: [
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(54, 162, 235, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(201, 203, 207, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });
}

let purposeChartInstance = null;

function renderPurposeChart() {
  const ctx = document.getElementById("purposeChart")?.getContext("2d");
  if (!ctx) return;

  const purposeRevenue = {};

  allTransactionsData.forEach((txn) => {
    const purpose = String(txn.paymentPurpose || "Other").trim();
    const amount = Number(txn.amount || 0);
    purposeRevenue[purpose] = (purposeRevenue[purpose] || 0) + amount;
  });

  const labels = Object.keys(purposeRevenue);
  const data = Object.values(purposeRevenue);

  if (labels.length === 0) {
    labels.push("No Data");
    data.push(0);
  }

  if (purposeChartInstance) {
    purposeChartInstance.destroy();
  }

  purposeChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(255, 99, 132, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 206, 86, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(255, 99, 132, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 206, 86, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });
}

// --- Table Loading + Pagination ---
async function loadDashboardTables() {
  await loadMembers();
  await loadTransactions();
  updateDashboardMetrics();
  await updateOutstandingMetric();
  renderRevenueChart();
  renderStreetChart();
  renderDebtChart();
  renderPurposeChart();
}

function updateDashboardMetrics() {
  const totalMembersEl = document.getElementById("total-members");
  if (totalMembersEl) {
    totalMembersEl.textContent = allMembersData.length;
  }

  const totalTxnsEl = document.getElementById("total-transactions");
  if (totalTxnsEl) {
    const totalRevenue = allTransactionsData.reduce(
      (sum, txn) => sum + Number(txn.amount || 0),
      0
    );
    totalTxnsEl.textContent = `₦${totalRevenue.toLocaleString()}`;
  }
}

async function updateOutstandingMetric() {
  try {
    const res = await fetchPost("getHistoricalPayments");
    const result = await res.json();
    const data = result.success
      ? result.data || []
      : Array.isArray(result)
      ? result
      : [];
    historicalPaymentsData = data.map(normalizeHistoricalPayment);
    const totalOutstanding = historicalPaymentsData.reduce(
      (sum, item) => sum + item.outstanding,
      0
    );
    const element = document.getElementById("total-outstanding");
    if (element) {
      element.textContent = `₦${totalOutstanding.toLocaleString()}`;
    }

    // Calculate Dues Collection Rate
    const totalExpected = historicalPaymentsData.reduce(
      (sum, item) => sum + item.expectedPayment,
      0
    );
    const totalActual = historicalPaymentsData.reduce(
      (sum, item) => sum + item.actualPayment,
      0
    );
    const rate =
      totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0;
    const rateElement = document.getElementById("collection-rate");
    if (rateElement) {
      rateElement.textContent = `${rate}%`;
    }
  } catch (err) {
    console.error("Failed to load outstanding metrics:", err);
  }
}

let debtChartInstance = null;

function renderDebtChart() {
  const ctx = document.getElementById("debtChart")?.getContext("2d");
  if (!ctx) return;

  const debtMap = {};

  (historicalPaymentsData || []).forEach((item) => {
    if (!item) return;
    const name = item.fullName || "Unknown";
    const outstanding = item.outstanding;

    if (outstanding > 0) {
      debtMap[name] = (debtMap[name] || 0) + outstanding;
    }
  });

  const sortedDebts = Object.entries(debtMap)
    .map(([name, outstanding]) => ({ name, outstanding }))
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  const labels = sortedDebts.map((d) => d.name);
  const data = sortedDebts.map((d) => d.outstanding);

  if (labels.length === 0) {
    labels.push("No Debts");
    data.push(0);
  }

  if (debtChartInstance) {
    debtChartInstance.destroy();
  }

  debtChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Outstanding Debt (₦)",
          data: data,
          backgroundColor: "rgba(220, 53, 69, 0.6)",
          borderColor: "rgba(220, 53, 69, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "₦" + value.toLocaleString();
            },
          },
        },
      },
    },
  });
}

async function loadMembers() {
  try {
    const res = await fetchPost("getMembers");
    const result = await res.json();
    const data = result.success
      ? result.data || []
      : Array.isArray(result)
      ? result
      : [];
    allMembersData = data.map(normalizeMember);
    window.allMembersData = allMembersData;
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
    const res = await fetchPost("getTransactions");
    const result = await res.json();
    const data = result.success
      ? result.data || []
      : Array.isArray(result)
      ? result
      : [];
    allTransactionsData = data.map(normalizeTransaction);
    window.allTransactionsData = allTransactionsData;
    currentTransactionData = [...allTransactionsData]; // Initialize filtered data
    renderTransactionPage(1);
    setupTransactionSearch();
  } catch (err) {
    console.error("Failed to load transactions:", err);
    Swal.fire("Error", "Failed to load transaction data", "error");
  }
}

function getValue(row, aliases, fallback = "") {
  if (!row) return fallback;

  if (Array.isArray(row)) {
    const index = aliases.find((alias) => Number.isInteger(alias));
    return index === undefined ? fallback : row[index] ?? fallback;
  }

  const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
    acc[normalizeKey(key)] = value;
    return acc;
  }, {});

  for (const alias of aliases) {
    if (Number.isInteger(alias)) continue;
    const value = normalizedRow[normalizeKey(alias)];
    if (value !== undefined && value !== null) return value;
  }

  return fallback;
}

function normalizeKey(key) {
  return String(key || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeMember(member) {
  let regDate = getValue(member, [
    "registeredDate",
    "Registered Date",
    "Date Registered",
    "Timestamp",
    "timestamp",
    10,
  ]);
  if (!regDate && member && typeof member === "object") {
    const dateKey = Object.keys(member).find((k) => {
      const nk = k.toLowerCase();
      return (
        nk.includes("date") ||
        nk.includes("joined") ||
        nk.includes("created") ||
        nk.includes("time") ||
        nk.includes("registered") ||
        nk.includes("timestamp")
      );
    });
    if (dateKey) {
      regDate = member[dateKey];
    }
  }
  return {
    memberId: getValue(member, ["memberId", "Member ID", "MemberID", "ID", 0]),
    fullName: getValue(member, ["fullName", "Full Name", "Name", 1]),
    phone: getValue(member, ["phone", "Phone", "Phone Number", 2]),
    address: getValue(member, [
      "address",
      "Address",
      "Residential Address",
      "residentialAddress",
      6,
    ]),
    registeredDate: regDate,
    email: getValue(member, ["email", "Email", "Email Address", 4]),
    houseNumber: getValue(member, ["houseNumber", "House No", "House Number", 5]),
    streetName: getValue(member, ["streetName", "Street Name", "Street", 6]),
    gender: getValue(member, ["gender", "Gender", 8]),
    occupation: getValue(member, ["occupation", "Occupation", 9]),
    note: getValue(member, ["note", "Note", 10]),
  };
}

function normalizeTransaction(transaction) {
  let transDate = getValue(transaction, [
    "transactionDate",
    "Transaction Date",
    "Date",
    "Timestamp",
    "timestamp",
    1,
  ]);
  if (!transDate && transaction && typeof transaction === "object") {
    const dateKey = Object.keys(transaction).find((k) => {
      const nk = k.toLowerCase();
      return (
        nk.includes("date") || nk.includes("time") || nk.includes("timestamp")
      );
    });
    if (dateKey) {
      transDate = transaction[dateKey];
    }
  }
  return {
    transactionId: getValue(transaction, [
      "transactionId",
      "Transaction ID",
      "TransactionID",
      0,
    ]),
    transactionDate: transDate,
    address: getValue(transaction, [
      "address",
      "Address",
      "Residential Address",
      "residentialAddress",
      2,
    ]),
    memberId: getValue(transaction, ["memberId", "Member ID", "MemberID", 3]),
    amount: getValue(transaction, ["amount", "Amount", 4], 0),
    paymentPurpose: getValue(transaction, [
      "paymentPurpose",
      "Payment Purpose",
      "Purpose",
      5,
    ]),
    paymentType: getValue(transaction, [
      "paymentType",
      "Payment Type",
      "Mode of Payment",
      6,
    ]),
    fromMonth: getValue(transaction, ["fromMonth", "From Month", 7]),
    toMonth: getValue(transaction, ["toMonth", "To Month", 8]),
    durationMonths: getValue(transaction, [
      "durationMonths",
      "Duration Months",
      "Duration",
      9,
    ]),
    recordedBy: getValue(transaction, ["recordedBy", "Recorded By", 10]),
    notes: getValue(transaction, ["notes", "Notes", 11]),
  };
}

function normalizeHistoricalPayment(item) {
  return {
    memberId: getValue(item, ["memberId", "Member ID", "MemberID", "ID", 0]),
    fullName: getValue(item, ["fullName", "Full Name", "Name", 1]),
    address: getValue(item, ["address", "Address", "Residential Address", 2]),
    year: getValue(item, ["year", "Year", 3]),
    monthlyRate: Number(getValue(item, ["monthlyRate", "Monthly Rate", 4], 0)),
    expectedPayment: Number(
      getValue(item, ["expectedPayment", "Expected Payment", 5], 0)
    ),
    actualPayment: Number(
      getValue(item, ["actualPayment", "Actual Payment", 6], 0)
    ),
    discountApplied:
      getValue(item, ["discountApplied", "Discount Applied", "Discount", 7]) ===
        true ||
      String(
        getValue(item, ["discountApplied", "Discount Applied", "Discount", 7])
      ).toLowerCase() === "true" ||
      getValue(item, ["discountApplied", "Discount Applied", "Discount", 7]) ===
        "Yes",
    outstanding: Number(
      getValue(item, ["outstanding", "Outstanding", "Outstanding Dues", 8], 0)
    ),
  };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString();
}

function formatCurrency(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `₦${amount.toLocaleString()}` : "";
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
        <td>${formatDate(member.registeredDate)}</td>
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
        <td>${formatCurrency(transaction.amount)}</td>
        <td>${transaction.paymentPurpose || ""}</td>
        <td>${formatDate(transaction.transactionDate)}</td>
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
  if (typeof window.generateMemberID === "function") {
    return window.generateMemberID();
  }
}

// Add to your DOMContentLoaded or initialization function
function setupTableActions() {
  // Member table actions
  document
    .getElementById("printMembersBtn")
    ?.addEventListener("click", () =>
      printTable("membersTable", "Registered Members")
    );
  document
    .getElementById("exportMembersBtn")
    ?.addEventListener("click", () =>
      exportToCSV(currentMemberData, "members")
    );

  document
    .getElementById("editMemberBtn")
    ?.addEventListener("click", () => {
      const selectedRow = document.querySelector("#member-table tr.selected");
      if (!selectedRow) {
        Swal.fire("Warning", "Please select a member first", "warning");
        return;
      }
      const memberId = selectedRow.cells[0].textContent.trim();
      const member = (window.allMembersData || []).find(m => String(m.memberId).trim() === memberId);
      if (!member) {
        Swal.fire("Error", "Member data not found locally", "error");
        return;
      }

      // Populate form fields
      document.getElementById("editMemberId").value = member.memberId || "";
      document.getElementById("editFullName").value = member.fullName || "";
      document.getElementById("editPhone").value = member.phone || "";
      document.getElementById("editEmail").value = member.email || "";
      document.getElementById("editHouseNumber").value = member.houseNumber || "";
      
      const streetSelect = document.getElementById("editStreetName");
      if (streetSelect) {
        streetSelect.value = member.streetName || "";
      }
      
      document.getElementById("editResidentialAddress").value = member.address || "";
      document.getElementById("editGender").value = member.gender || "Male";
      document.getElementById("editOccupation").value = member.occupation || "";
      document.getElementById("editNote").value = member.note || "";

      openModalById("editMemberModal");
    });

  // Transaction table actions
  document
    .getElementById("receiptBtn")
    ?.addEventListener("click", generateReceipt);
  document
    .getElementById("printTransactionsBtn")
    ?.addEventListener("click", () =>
      printTable("transactionsTable", "Transaction Records")
    );
  document
    .getElementById("exportTransactionsBtn")
    ?.addEventListener("click", () =>
      exportToCSV(currentTransactionData, "transactions")
    );
}

// Print function
function printTable(tableId, title) {
  const table = document.getElementById(tableId);
  if (!table) return;

  // Find the selected row in this table
  const selectedRow = table.querySelector("tbody tr.selected");
  if (!selectedRow) {
    Swal.fire(
      "Selection Required",
      "Please select a row in the table first before printing.",
      "warning"
    );
    return;
  }

  // Create a clean table clone with only the header and the selected row
  const tableClone = document.createElement("table");
  tableClone.className = "table table-bordered";

  // Clone the thead (header)
  const thead = table.querySelector("thead");
  if (thead) {
    tableClone.appendChild(thead.cloneNode(true));
  }

  // Clone the tbody with ONLY the selected row
  const tbody = document.createElement("tbody");
  tbody.appendChild(selectedRow.cloneNode(true));
  tableClone.appendChild(tbody);

  // Remove action buttons or selections from print view
  tableClone.querySelectorAll(".no-print").forEach((el) => el.remove());
  tableClone
    .querySelectorAll("tr")
    .forEach((tr) => tr.classList.remove("selected"));

  // Get or create print section
  let printSection = document.getElementById("print-section");
  if (!printSection) {
    printSection = document.createElement("div");
    printSection.id = "print-section";
    document.body.appendChild(printSection);
  }

  // Populate print section
  printSection.innerHTML = `
    <style>
      #print-section h2 { color: #333; margin-bottom: 10px; font-family: Arial, sans-serif; }
      #print-section p { font-family: Arial, sans-serif; color: #666; margin-bottom: 20px; }
      #print-section table { width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; }
      #print-section th, #print-section td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      #print-section th { background-color: #f2f2f2; }
    </style>
    <h2>${title}</h2>
    <p>Generated on ${new Date().toLocaleString()}</p>
    ${tableClone.outerHTML}
  `;

  // Trigger printing
  window.print();

  // Clean up after print dialog is closed
  window.addEventListener(
    "afterprint",
    function cleanup() {
      printSection.innerHTML = "";
      window.removeEventListener("afterprint", cleanup);
    },
    { once: true }
  );
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
    address: cells[2].textContent,
    amount: cells[3].textContent,
    purpose: cells[4].textContent,
    date: cells[5].textContent,
  };

  // Find member details for name and fallback address
  const member = (window.allMembersData || []).find(
    (m) => m.memberId === transactionData.memberId
  );
  const residentName = member ? member.fullName : "N/A";
  const residentAddress =
    transactionData.address || (member ? member.address : "N/A");

  // Show SweetAlert2 receipt delivery menu
  Swal.fire({
    title: "Receipt Delivery Options",
    text: "Select how you would like to deliver this receipt:",
    icon: "info",
    showCancelButton: true,
    showConfirmButton: false,
    cancelButtonText: "Close",
    html: `
      <div class="d-flex flex-column gap-2 mt-3" style="max-width: 320px; margin: 0 auto;">
        <button id="btn-print-receipt" class="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-printer" viewBox="0 0 16 16">
            <path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/>
            <path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2zM4 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2H4zm1 5a2 2 0 0 0-2 2v1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v-1a2 2 0 0 0-2-2zm7 2v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1"/>
          </svg> Print Receipt
        </button>
        <button id="btn-whatsapp-receipt" class="btn btn-success w-100 py-2 d-flex align-items-center justify-content-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.949h.004c4.368 0 7.927-3.558 7.93-7.927a7.9 7.9 0 0 0-2.327-5.594ZM7.994 14.52a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.69-4.98c-.202-.101-1.194-.588-1.378-.654-.184-.066-.317-.1-.45.1-.132.2-.51.654-.624.782-.114.128-.228.144-.43.041a7.43 7.43 0 0 1-2.39-1.474 8.3 8.3 0 0 1-1.658-2.062c-.12-.206-.013-.317.089-.419.09-.09.202-.236.302-.354.101-.118.134-.2.202-.336.068-.137.034-.257-.017-.359-.05-.101-.45-1.082-.617-1.486-.162-.39-.329-.337-.45-.337-.114-.005-.246-.005-.379-.005-.133 0-.35.05-.533.25-.182.2-.699.682-.699 1.666s.718 1.932.818 2.062c.1.13 1.414 2.163 3.424 3.03.48.208.855.33 1.15.424.483.153.924.13 1.272.078.388-.058 1.194-.488 1.362-.958.169-.47.169-.874.118-.958-.05-.084-.184-.132-.387-.233"/>
          </svg> Send via WhatsApp
        </button>
        <button id="btn-email-receipt" class="btn btn-info w-100 py-2 d-flex align-items-center justify-content-center gap-2 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope" viewBox="0 0 16 16">
            <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1zm13 2.383-4.708 2.825L15 11.105zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741M1 11.105l4.708-2.897L1 5.383z"/>
          </svg> Send via Email
        </button>
      </div>
    `,
    didOpen: () => {
      document.getElementById("btn-print-receipt")?.addEventListener("click", () => {
        Swal.close();
        printReceipt(transactionData, residentName, residentAddress);
      });
      document.getElementById("btn-whatsapp-receipt")?.addEventListener("click", () => {
        Swal.close();
        sendWhatsAppReceipt(transactionData, member, residentName);
      });
      document.getElementById("btn-email-receipt")?.addEventListener("click", () => {
        Swal.close();
        sendEmailReceipt(transactionData, member);
      });
    },
  });
}

function printReceipt(transactionData, residentName, residentAddress) {
  // Get or create print section
  let printSection = document.getElementById("print-section");
  if (!printSection) {
    printSection = document.createElement("div");
    printSection.id = "print-section";
    document.body.appendChild(printSection);
  }

  // Populate print section with receipt layout
  printSection.innerHTML = `
    <style>
      .receipt-print {
        border: 1px solid #ddd;
        padding: 20px;
        max-width: 350px;
        margin: 20px auto;
        font-family: Arial, sans-serif;
      }
      .receipt-print .header { text-align: center; margin-bottom: 20px; }
      .receipt-print .logo { font-size: 24px; font-weight: bold; color: #28a745; }
      .receipt-print .title { font-size: 18px; margin: 10px 0; }
      .receipt-print .divider { border-top: 1px dashed #ddd; margin: 15px 0; }
      .receipt-print .detail { display: flex; justify-content: space-between; margin: 8px 0; }
      .receipt-print .label { font-weight: bold; }
      .receipt-print .footer { text-align: center; margin-top: 30px; font-size: 12px; }
    </style>
    <div class="receipt-print">
      <div class="header">
        <div class="logo">COMMUNITY FINANCE</div>
        <div class="title">OFFICIAL RECEIPT</div>
        <div style="font-size: 13px; color: #555; margin-top: 8px; text-align: left; border: 1px solid #eee; padding: 8px; border-radius: 4px; background-color: #f9f9f9;">
          <strong>Resident:</strong> ${residentName}<br>
          <strong>Address:</strong> ${residentAddress}
        </div>
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
  `;

  // Trigger printing
  window.print();

  // Clean up after print dialog is closed
  window.addEventListener(
    "afterprint",
    function cleanup() {
      printSection.innerHTML = "";
      window.removeEventListener("afterprint", cleanup);
    },
    { once: true }
  );
}

function sendWhatsAppReceipt(transactionData, member, residentName) {
  let rawPhone = member ? member.phone : "";
  if (!rawPhone) {
    Swal.fire("Phone Missing", `No registered phone number found for ${residentName}.`, "warning");
    return;
  }

  // Format phone to international standard (e.g. convert 080... to 23480...)
  let formattedPhone = String(rawPhone).trim().replace(/[^0-9+]/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '234' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1);
  }

  if (formattedPhone.length < 10) {
    Swal.fire("Invalid Phone", `The phone number "${rawPhone}" is invalid or too short.`, "warning");
    return;
  }

  const message = `Hello *${residentName}*,\n\nThis is your official payment receipt from *ALESE CDA*.\n\n*Receipt Details:*\n• *Receipt No:* ${transactionData.id}\n• *Date:* ${transactionData.date}\n• *Member ID:* ${transactionData.memberId}\n• *Amount:* ${transactionData.amount}\n• *Purpose:* ${transactionData.purpose}\n\nThank you for your payment!`;

  const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

async function sendEmailReceipt(transactionData, member) {
  const recipientEmail = member ? member.email : "";
  const residentName = member ? member.fullName : "Resident";
  
  if (!recipientEmail || recipientEmail.indexOf("@") === -1) {
    Swal.fire("Email Missing", `No registered email address found for ${residentName}.`, "warning");
    return;
  }

  Swal.fire({
    title: "Sending Email",
    text: `Sending receipt to ${recipientEmail}...`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const res = await fetchPost("sendReceiptEmail", {
      transactionId: transactionData.id
    });
    const result = await res.json();
    if (result.success) {
      Swal.fire("Success", result.message, "success");
    } else {
      Swal.fire("Error", result.message, "error");
    }
  } catch (err) {
    console.error(err);
    Swal.fire("Error", "Network error occurred while sending email", "error");
  }
}

// Add row selection for receipts
function setupTableRowSelection() {
  // Event delegation for member table rows click selection
  document
    .getElementById("member-table")
    ?.addEventListener("click", function (e) {
      const row = e.target.closest("tr");
      if (!row) return;
      document
        .querySelectorAll("#member-table tr")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
    });

  // Event delegation for transaction table rows click selection
  document
    .getElementById("transaction-table")
    ?.addEventListener("click", function (e) {
      const row = e.target.closest("tr");
      if (!row) return;
      document
        .querySelectorAll("#transaction-table tr")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
    });

  // Event delegation for historical table rows click selection
  document
    .getElementById("historical-table-body")
    ?.addEventListener("click", function (e) {
      const row = e.target.closest("tr");
      if (!row) return;
      document
        .querySelectorAll("#historical-table-body tr")
        .forEach((r) => r.classList.remove("selected"));
      row.classList.add("selected");
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const historicalBtn = document.getElementById("historical-btn");

  if (historicalBtn) {
    historicalBtn.addEventListener("click", async function (e) {
      e.preventDefault();
      // Initialize modal immediately so user sees loading state
      const modalElement = document.getElementById("historicalPaymentModal");
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();

      const historicalTable = document.getElementById("historical-table-body");
      if (historicalTable) {
        historicalTable.innerHTML = `<tr><td colspan="10" class="text-center">Loading historical summary...</td></tr>`;
      }

      try {
        const res = await fetchPost("getHistoricalPayments");
        const result = await res.json();
        const rawData = result.success
          ? result.data || []
          : Array.isArray(result)
          ? result
          : [];
        historicalPaymentsData = rawData.map(normalizeHistoricalPayment);

        populateHistoricalStreetFilter(); // Dynamically load unique streets
        renderHistoricalTable();
        setupHistoricalSearch(); // Activate search
        setupHistoricalToggle(); // Activate grouped switch toggle
        setupHistoricalFilters(); // Activate street & debt status dropdown filters
        setupHistoricalHeadersSorting(); // Activate header sorting clicks
        setupAccordionToggle(); // Activate accordion expand/collapse
      } catch (err) {
        console.error("Error loading historical summary:", err);
        if (historicalTable) {
          historicalTable.innerHTML = `<tr><td colspan="10" class="text-danger text-center">Error loading data</td></tr>`;
        }
      }
    });
  }
});

function getStreetFromAddress(address) {
  if (!address) return "";
  const trimmed = address.trim();
  const match = trimmed.match(/^\d+\s+(.+)$/);
  return match ? match[1].trim() : trimmed;
}

function populateHistoricalStreetFilter() {
  const select = document.getElementById("historicalStreetFilter");
  if (!select) return;

  const uniqueStreets = new Set();
  (historicalPaymentsData || []).forEach((item) => {
    if (item.address) {
      const street = getStreetFromAddress(item.address);
      if (street) uniqueStreets.add(street);
    }
  });

  select.innerHTML = '<option value="">All Streets</option>';
  [...uniqueStreets].sort().forEach((street) => {
    const opt = document.createElement("option");
    opt.value = street;
    opt.textContent = street;
    select.appendChild(opt);
  });
}

function setupHistoricalToggle() {
  const toggle = document.getElementById("groupedViewToggle");
  if (!toggle) return;
  if (!toggle.dataset.listenerAttached) {
    toggle.addEventListener("change", () => {
      renderHistoricalTable();
    });
    toggle.dataset.listenerAttached = "true";
  }
}

function setupHistoricalSearch() {
  const input = document.getElementById("historicalSearch");
  if (!input) return;
  if (!input.dataset.listenerAttached) {
    input.addEventListener("input", () => {
      renderHistoricalTable();
    });
    input.dataset.listenerAttached = "true";
  }
}

function setupHistoricalFilters() {
  const streetFilter = document.getElementById("historicalStreetFilter");
  const debtFilter = document.getElementById("historicalDebtFilter");

  if (streetFilter && !streetFilter.dataset.listenerAttached) {
    streetFilter.addEventListener("change", () => {
      renderHistoricalTable();
    });
    streetFilter.dataset.listenerAttached = "true";
  }

  if (debtFilter && !debtFilter.dataset.listenerAttached) {
    debtFilter.addEventListener("change", () => {
      renderHistoricalTable();
    });
    debtFilter.dataset.listenerAttached = "true";
  }
}

function setupHistoricalHeadersSorting() {
  const table = document.querySelector("#historicalPaymentModal table");
  if (!table) return;
  const thead = table.querySelector("thead");
  if (!thead) return;

  if (!thead.dataset.listenerAttached) {
    thead.addEventListener("click", (e) => {
      const th = e.target.closest("th");
      if (!th) return;

      const column = th.getAttribute("data-sort");
      if (!column) return; // Column is not sortable

      if (historicalSortColumn === column) {
        historicalSortOrder = historicalSortOrder === "asc" ? "desc" : "asc";
      } else {
        historicalSortColumn = column;
        historicalSortOrder = "asc";
      }

      updateSortingHeadersUI();
      renderHistoricalTable();
    });
    thead.dataset.listenerAttached = "true";
  }
  updateSortingHeadersUI();
}

function updateSortingHeadersUI() {
  const table = document.querySelector("#historicalPaymentModal table");
  if (!table) return;
  const headers = table.querySelectorAll("thead th");

  headers.forEach((th) => {
    const col = th.getAttribute("data-sort");
    if (!col) return;

    let text = th.textContent.replace(/ [▲▼]/g, "");

    if (col === historicalSortColumn) {
      text += historicalSortOrder === "asc" ? " ▲" : " ▼";
      th.classList.add("table-active");
    } else {
      th.classList.remove("table-active");
    }
    th.textContent = text;
  });
}

function setupAccordionToggle() {
  const tbody = document.getElementById("historical-table-body");
  if (!tbody) return;
  if (!tbody.dataset.listenerAttached) {
    tbody.addEventListener("click", (e) => {
      const parentRow = e.target.closest(".parent-row");
      if (!parentRow) return;

      // Ignore clicks on action buttons
      if (e.target.closest("button") || e.target.closest("a")) return;

      const memberId = parentRow.getAttribute("data-member-id");
      const detailRow = document.getElementById(`detail-${memberId}`);
      const arrow = parentRow.querySelector(".toggle-arrow");

      if (detailRow && arrow) {
        if (detailRow.classList.contains("d-none")) {
          detailRow.classList.remove("d-none");
          arrow.style.transform = "rotate(90deg)";
          parentRow.classList.add("table-info");
        } else {
          detailRow.classList.add("d-none");
          arrow.style.transform = "";
          parentRow.classList.remove("table-info");
        }
      }
    });
    tbody.dataset.listenerAttached = "true";
  }
}

function renderHistoricalTable() {
  const tbody = document.getElementById("historical-table-body");
  if (!tbody) return;

  const searchInput = document.getElementById("historicalSearch");
  const term = searchInput ? searchInput.value.toLowerCase() : "";
  const streetFilter = document.getElementById("historicalStreetFilter");
  const selectedStreet = streetFilter ? streetFilter.value : "";
  const debtFilter = document.getElementById("historicalDebtFilter");
  const selectedDebt = debtFilter ? debtFilter.value : "all";
  const toggle = document.getElementById("groupedViewToggle");
  const isGrouped = toggle ? toggle.checked : true;

  // 1. Filter raw payments data first
  let filtered = (historicalPaymentsData || []).filter((item) => {
    const memberId = String(item.memberId || "").toLowerCase();
    const fullName = String(item.fullName || "").toLowerCase();
    const address = String(item.address || "").toLowerCase();
    const year = String(item.year || "").toLowerCase();

    // Search filter
    const matchesSearch =
      memberId.includes(term) ||
      fullName.includes(term) ||
      address.includes(term) ||
      year.includes(term);
    if (!matchesSearch) return false;

    // Street filter
    if (selectedStreet) {
      const street = getStreetFromAddress(item.address);
      if (street !== selectedStreet) return false;
    }

    // Debt Status filter
    if (selectedDebt === "outstanding" && item.outstanding <= 0) return false;
    if (selectedDebt === "settled" && item.outstanding > 0) return false;

    return true;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-danger text-center">No matching data found</td></tr>`;
    return;
  }

  if (isGrouped) {
    // Group records by memberId
    const groups = {};
    filtered.forEach((item) => {
      if (!groups[item.memberId]) {
        groups[item.memberId] = {
          memberId: item.memberId,
          fullName: item.fullName,
          address: item.address,
          years: [],
          totalExpected: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          records: [],
          monthlyRate: item.monthlyRate,
          discountApplied: item.discountApplied,
          year: item.year,
        };
      }
      groups[item.memberId].years.push(item.year);
      groups[item.memberId].totalExpected += item.expectedPayment;
      groups[item.memberId].totalPaid += item.actualPayment;
      groups[item.memberId].totalOutstanding += item.outstanding;
      groups[item.memberId].records.push(item);
    });

    let groupedList = Object.values(groups);

    // 2. Sort Grouped List
    groupedList.sort((a, b) => {
      let valA, valB;
      switch (historicalSortColumn) {
        case "memberId":
          valA = a.memberId;
          valB = b.memberId;
          break;
        case "fullName":
          valA = a.fullName;
          valB = b.fullName;
          break;
        case "address":
          valA = a.address;
          valB = b.address;
          break;
        case "year":
          valA = Math.max(...a.years);
          valB = Math.max(...b.years);
          break;
        case "monthlyRate":
          valA = a.monthlyRate;
          valB = b.monthlyRate;
          break;
        case "expectedPayment":
          valA = a.totalExpected;
          valB = b.totalExpected;
          break;
        case "actualPayment":
          valA = a.totalPaid;
          valB = b.totalPaid;
          break;
        case "discountApplied":
          valA = a.records.some((r) => r.discountApplied) ? 1 : 0;
          valB = b.records.some((r) => r.discountApplied) ? 1 : 0;
          break;
        case "outstanding":
          valA = a.totalOutstanding;
          valB = b.totalOutstanding;
          break;
        default:
          valA = a.fullName;
          valB = b.fullName;
      }

      if (typeof valA === "string") {
        return historicalSortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return historicalSortOrder === "asc" ? valA - valB : valB - valA;
      }
    });

    // 3. Render Grouped Rows
    groupedList.forEach((g) => {
      g.records.sort((a, b) => b.year - a.year);
      const uniqueYears = [...new Set(g.years)].sort((a, b) => a - b);
      const yearStr =
        uniqueYears.length > 1
          ? `${uniqueYears[0]} - ${uniqueYears[uniqueYears.length - 1]}`
          : uniqueYears[0] || "";

      tbody.innerHTML += `
        <tr class="parent-row" data-member-id="${
          g.memberId
        }" style="cursor: pointer;">
          <td>
            <i class="bi bi-chevron-right toggle-arrow me-2 d-inline-block" style="transition: transform 0.2s; font-size: 0.8rem;"></i>
            ${g.memberId}
          </td>
          <td><strong>${g.fullName}</strong></td>
          <td>${g.address}</td>
          <td>${yearStr}</td>
          <td class="text-muted">-</td>
          <td>₦${g.totalExpected.toLocaleString()}</td>
          <td>₦${g.totalPaid.toLocaleString()}</td>
          <td class="text-muted">-</td>
          <td class="text-danger fw-bold">₦${g.totalOutstanding.toLocaleString()}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center gap-1">
              <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); printMemberSummary('${
                g.memberId
              }')">
                Print
              </button>
              <button class="btn btn-sm btn-outline-success" onclick="event.stopPropagation(); downloadMemberSummaryPDF('${
                g.memberId
              }')">
                PDF
              </button>
              <button class="btn btn-sm btn-outline-success" onclick="event.stopPropagation(); sendWhatsAppReminder('${
                g.memberId
              }')">
                WhatsApp
              </button>
            </div>
          </td>
        </tr>
        <tr class="detail-row d-none" id="detail-${g.memberId}">
          <td colspan="10" class="p-3 bg-light">
            <div class="card card-body shadow-sm py-2 px-3">
              <h6 class="mb-2 text-primary border-bottom pb-1" style="font-size: 0.9rem;">Payment History Details</h6>
              <table class="table table-bordered table-sm mb-0 bg-white" style="font-size: 0.85rem;">
                <thead class="table-light">
                  <tr>
                    <th>Year</th>
                    <th>Monthly Rate</th>
                    <th>Expected Payment</th>
                    <th>Actual Payment</th>
                    <th>Discount</th>
                    <th>Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  ${g.records
                    .map(
                      (r) => `
                    <tr>
                      <td>${r.year}</td>
                      <td>₦${r.monthlyRate.toLocaleString()}</td>
                      <td>₦${r.expectedPayment.toLocaleString()}</td>
                      <td>₦${r.actualPayment.toLocaleString()}</td>
                      <td>${r.discountApplied ? "Yes" : "No"}</td>
                      <td class="${
                        r.outstanding > 0
                          ? "text-danger fw-bold"
                          : "text-success"
                      }">
                        ₦${r.outstanding.toLocaleString()}
                      </td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    });
  } else {
    // 2. Sort Flat List
    filtered.sort((a, b) => {
      let valA = a[historicalSortColumn];
      let valB = b[historicalSortColumn];

      if (historicalSortColumn === "discountApplied") {
        valA = a.discountApplied ? 1 : 0;
        valB = b.discountApplied ? 1 : 0;
      }

      if (typeof valA === "string") {
        return historicalSortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return historicalSortOrder === "asc" ? valA - valB : valB - valA;
      }
    });

    // 3. Render standard flat rows
    filtered.forEach((item) => {
      tbody.innerHTML += `
        <tr>
          <td>${item.memberId}</td>
          <td>${item.fullName}</td>
          <td>${item.address}</td>
          <td>${item.year}</td>
          <td>₦${item.monthlyRate.toLocaleString()}</td>
          <td>₦${item.expectedPayment.toLocaleString()}</td>
          <td>₦${item.actualPayment.toLocaleString()}</td>
          <td>${item.discountApplied ? "Yes" : "No"}</td>
          <td class="text-danger">₦${item.outstanding.toLocaleString()}</td>
          <td class="text-center">
            <div class="d-flex justify-content-center gap-1">
              <button class="btn btn-sm btn-outline-primary" onclick="printMemberSummary('${
                item.memberId
              }')">
                Print
              </button>
              <button class="btn btn-sm btn-outline-success" onclick="downloadMemberSummaryPDF('${
                item.memberId
              }')">
                PDF
              </button>
              <button class="btn btn-sm btn-outline-success" onclick="sendWhatsAppReminder('${
                item.memberId
              }')">
                WhatsApp
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  }
}

async function printMemberSummary(memberId) {
  try {
    const data = historicalPaymentsData || [];
    const memberData = data.filter((d) => d.memberId === memberId);
    if (!memberData.length) return alert("No data for this member.");

    const { fullName, address } = memberData[0];
    const totalPaid = memberData.reduce(
      (sum, row) => sum + row.actualPayment,
      0
    );
    const totalOutstanding = memberData.reduce(
      (sum, row) => sum + row.outstanding,
      0
    );

    const txns = allTransactionsData || [];
    const memberTxns = txns
      .filter(
        (t) =>
          t.memberId === memberId &&
          (t.paymentPurpose || "").toLowerCase().includes("monthly")
      )
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
      .slice(0, 5);

    // Get or create print section
    let printSection = document.getElementById("print-section");
    if (!printSection) {
      printSection = document.createElement("div");
      printSection.id = "print-section";
      document.body.appendChild(printSection);
    }

    printSection.innerHTML = `
      <style>
        .summary-print {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        .summary-print table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
        .summary-print th, .summary-print td { border: 1px solid #aaa; padding: 8px; }
        .summary-print th { background-color: #eee; }
      </style>
      <div class="summary-print">
        <h2>Historical Payment Summary for ${fullName}</h2>
        <p><strong>ID:</strong> ${memberId}<br><strong>Address:</strong> ${address}</p>
        <h4>Yearly Summary</h4>
        <table>
          <thead>
            <tr>
              <th>Year</th><th>Monthly</th><th>Expected</th><th>Paid</th><th>Discount</th><th>Outstanding</th>
            </tr>
          </thead>
          <tbody>
            ${memberData
              .map(
                (r) => `
              <tr>
                <td>${r.year}</td>
                <td>₦${r.monthlyRate.toLocaleString()}</td>
                <td>₦${r.expectedPayment.toLocaleString()}</td>
                <td>₦${r.actualPayment.toLocaleString()}</td>
                <td>${r.discountApplied ? "Yes" : "No"}</td>
                <td>₦${r.outstanding.toLocaleString()}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>

        <h4>Last 5 Monthly Dues Payments</h4>
        <table>
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Type</th><th>From</th><th>To</th></tr>
          </thead>
          <tbody>
            ${memberTxns
              .map(
                (txn) => `
              <tr>
                <td>${new Date(txn.transactionDate).toLocaleDateString()}</td>
                <td>₦${Number(txn.amount).toLocaleString()}</td>
                <td>${txn.paymentType}</td>
                <td>${txn.fromMonth || "-"}</td>
                <td>${txn.toMonth || "-"}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>

        <h4>Total Paid: ₦${totalPaid.toLocaleString()}</h4>
        <h4>Total Outstanding: ₦${totalOutstanding.toLocaleString()}</h4>
        <br><small>Printed on ${new Date().toLocaleString()}</small>
      </div>
    `;

    // Trigger printing
    window.print();

    // Clean up after print dialog is closed
    window.addEventListener(
      "afterprint",
      function cleanup() {
        printSection.innerHTML = "";
        window.removeEventListener("afterprint", cleanup);
      },
      { once: true }
    );
  } catch (err) {
    console.error("Error printing summary:", err);
    alert("Could not generate print view.");
  }
}

window.printMemberSummary = printMemberSummary;

async function downloadMemberSummaryPDF(memberId) {
  try {
    const data = historicalPaymentsData || [];
    const memberData = data.filter((d) => d.memberId === memberId);
    if (!memberData.length) {
      Swal.fire(
        "Error",
        "No historical records found for this member.",
        "error"
      );
      return;
    }

    const { fullName, address } = memberData[0];
    const totalExpected = memberData.reduce(
      (sum, row) => sum + row.expectedPayment,
      0
    );
    const totalPaid = memberData.reduce(
      (sum, row) => sum + row.actualPayment,
      0
    );
    const totalOutstanding = memberData.reduce(
      (sum, row) => sum + row.outstanding,
      0
    );

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. Header Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(40, 167, 69); // Green theme color matching branding
    doc.text("ALESE CDA", 105, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("Community Dues & Levies Management Statement", 105, 26, {
      align: "center",
    });

    // 2. Info Box (Resident Details)
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(250, 250, 250);
    doc.rect(15, 33, 180, 25, "FD"); // Filled and bordered rectangle

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("RESIDENT INFORMATION", 20, 39);

    doc.setFont("helvetica", "normal");
    doc.text(`Full Name:  ${fullName}`, 20, 45);
    doc.text(`Member ID:  ${memberId}`, 20, 51);
    doc.text(`Address:    ${address}`, 110, 45);
    doc.text(`Generated:  ${new Date().toLocaleDateString()}`, 110, 51);

    // 3. AutoTable Dues Summary
    const tableBody = memberData.map((r) => [
      String(r.year || ""),
      `N${(r.monthlyRate || 0).toLocaleString()}`,
      `N${(r.expectedPayment || 0).toLocaleString()}`,
      `N${(r.actualPayment || 0).toLocaleString()}`,
      r.discountApplied ? "Yes" : "No",
      `N${(r.outstanding || 0).toLocaleString()}`,
    ]);

    doc.autoTable({
      startY: 64,
      head: [
        [
          "Year",
          "Monthly Rate",
          "Expected Payment",
          "Actual Payment",
          "Discount",
          "Outstanding",
        ],
      ],
      body: tableBody,
      theme: "grid",
      headStyles: {
        fillColor: [40, 167, 69], // Green header
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        5: { fontStyle: "bold", textColor: [220, 53, 69] }, // Outstanding in red
      },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      foot: [
        [
          "TOTALS",
          "",
          `N${totalExpected.toLocaleString()}`,
          `N${totalPaid.toLocaleString()}`,
          "",
          `N${totalOutstanding.toLocaleString()}`,
        ],
      ],
      footStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        fontSize: 9,
      },
    });

    // 4. Footer Section
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "This is an official statement generated from the ALESE CDA Finance system.",
      15,
      finalY + 15
    );
    doc.text(
      "If you have questions about payments, please contact the treasurer.",
      15,
      finalY + 20
    );

    // Save the PDF
    const filename = `${fullName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")}_dues_statement.pdf`;
    doc.save(filename);

    Swal.fire({
      icon: "success",
      title: "PDF Generated",
      text: `Dues statement downloaded as ${filename}`,
      timer: 2000,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to generate PDF:", err);
    Swal.fire("Error", "Could not generate PDF statement.", "error");
  }
}

window.downloadMemberSummaryPDF = downloadMemberSummaryPDF;

function sendWhatsAppReminder(memberId) {
  try {
    const data = historicalPaymentsData || [];
    const memberRecords = data.filter(d => d.memberId === memberId);
    if (!memberRecords.length) {
      Swal.fire("Error", "No historical records found for this resident.", "error");
      return;
    }

    const fullName = memberRecords[0].fullName || "Resident";
    const totalOutstanding = memberRecords.reduce((sum, row) => sum + (row.outstanding || 0), 0);

    if (totalOutstanding <= 0) {
      Swal.fire("Fully Paid", `${fullName} has no outstanding dues.`, "info");
      return;
    }

    // Sort records by year ascending
    const sortedRecords = [...memberRecords].sort((a, b) => parseInt(a.year, 10) - parseInt(b.year, 10));

    // Compile breakdown of unpaid years
    let breakdownText = "";
    sortedRecords.forEach(row => {
      const outstandingVal = row.outstanding || 0;
      if (outstandingVal > 0) {
        breakdownText += `• *Year ${row.year}*:\n`;
        breakdownText += `  - Expected: ₦${(row.expectedPayment || 0).toLocaleString()}\n`;
        breakdownText += `  - Paid: ₦${(row.actualPayment || 0).toLocaleString()}\n`;
        breakdownText += `  - Outstanding: ₦${outstandingVal.toLocaleString()}\n\n`;
      }
    });

    // Look up phone number from window.allMembersData
    const members = window.allMembersData || [];
    const member = members.find(m => m.memberId === memberId);
    let rawPhone = member ? member.phone : "";

    if (!rawPhone) {
      Swal.fire("Phone Missing", `No registered phone number found for ${fullName}.`, "warning");
      return;
    }

    // Format phone to international standard (e.g. convert 080... to 23480...)
    let formattedPhone = String(rawPhone).trim().replace(/[^0-9+]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Double-check the length to avoid malformed links
    if (formattedPhone.length < 10) {
      Swal.fire("Invalid Phone", `The phone number "${rawPhone}" is invalid or too short.`, "warning");
      return;
    }

    const message = `Dear ${fullName},\n\nThis is a friendly reminder from *ALESE CDA* regarding your outstanding dues.\n\n*Payment Summary Breakdown:*\n------------------------------\n${breakdownText}------------------------------\n*Total Outstanding Balance: ₦${totalOutstanding.toLocaleString()}*\n\nMake all payments into the *CDA Account Ecobank 1822001018*.\n\nThank you for your service and transparency!`;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    Swal.fire({
      icon: "success",
      title: "Opening WhatsApp",
      text: `Opening chat for ${fullName} in a new tab...`,
      timer: 1500,
      showConfirmButton: false
    });
  } catch (err) {
    console.error("WhatsApp reminder failed:", err);
    Swal.fire("Error", "Failed to initiate WhatsApp chat.", "error");
  }
}

window.sendWhatsAppReminder = sendWhatsAppReminder;

