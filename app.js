// ===== State & Data =====
let allDrugs = [];
let allSales = [];
const MIN_STOCK = 5;
let currentRole = 'user';

// Role check
function getRole() {
    return localStorage.getItem('role') || 'user';
}

function isAdmin() {
    return getRole() === 'admin';
}

// ===== DOM Elements =====
const loginPage = document.getElementById("loginPage");
const mainApp = document.getElementById("mainApp");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const drugSelect = document.getElementById("drugSelect");
const qtyInput = document.getElementById("qty");
const drugSearchInput = document.getElementById("drugSearch");
const salesBody = document.getElementById("salesBody");
const recentSalesBody = document.getElementById("recentSalesBody");
const inventoryBody = document.getElementById("inventoryBody");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const filterSalesBtn = document.getElementById("filterSalesBtn");
const clearSalesFilterBtn = document.getElementById("clearSalesFilterBtn");

// Stats elements
const totalSalesEl = document.getElementById("totalSales");
const dailyEl = document.getElementById("dailyTotal");
const monthlyEl = document.getElementById("monthlyTotal");
const yearlyEl = document.getElementById("yearlyTotal");
const currentDateEl = document.getElementById("currentDate");

// Inventory stats
const totalDrugsEl = document.getElementById("totalDrugs");
const lowStockCountEl = document.getElementById("lowStockCount");
const totalValueEl = document.getElementById("totalValue");

// Modal elements
const drugModal = document.getElementById("drugModal");
const drugForm = document.getElementById("drugForm");
const editDrugId = document.getElementById("editDrugId");
const modalTitle = document.getElementById("modalTitle");

// ===== Init =====
document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  setupLogin();
});

function checkLoginStatus() {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (isLoggedIn) {
    showMainApp();
  } else {
    showLoginPage();
  }
}

function showLoginPage() {
  loginPage.style.display = "flex";
  mainApp.style.display = "none";
}

function showMainApp() {
  loginPage.style.display = "none";
  mainApp.style.display = "flex";
  mainApp.style.width = "100%";
  initData();
  setupNavigation();
  setCurrentDate();
  loadAll();
  loadAdminPages();
  setupRoleBasedUI();
}

function setupLogin() {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === VALID_USERNAME && password === VALID_PASSWORD) {
      localStorage.setItem("isLoggedIn", "true");
      showMainApp();
    } else {
      loginError.textContent = "Invalid username or password";
      setTimeout(() => { loginError.textContent = ""; }, 3000);
    }
  });
}

function logout() {
  localStorage.removeItem("isLoggedIn");
  showLoginPage();
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
}

function initData() {
  const storedDrugs = localStorage.getItem("drugs");
  if (!storedDrugs) {
    allDrugs = getDefaultDrugs();
    localStorage.setItem("drugs", JSON.stringify(allDrugs));
  } else {
    allDrugs = JSON.parse(storedDrugs);
  }

  const storedSales = localStorage.getItem("sales");
  if (storedSales) {
    allSales = JSON.parse(storedSales);
  }
}

function getDefaultDrugs() {
  return [
    { id: "1", name: "Paracetamol", category: "Pain Relief", quantity: 100, price: 20, expiry: "2026-12-31" },
    { id: "2", name: "Amoxicillin", category: "Antibiotic", quantity: 50, price: 150, expiry: "2026-06-30" },
    { id: "3", name: "Aspirin", category: "Pain Relief", quantity: 75, price: 15, expiry: "2027-01-31" },
    { id: "4", name: "Ibuprofen", category: "Pain Relief", quantity: 60, price: 35, expiry: "2026-09-30" },
    { id: "5", name: "Cetirizine", category: "Allergy", quantity: 40, price: 25, expiry: "2026-08-31" },
    { id: "6", name: "Vitamin C", category: "Vitamins", quantity: 200, price: 50, expiry: "2027-06-30" },
    { id: "7", name: "Metronidazole", category: "Antibiotic", quantity: 30, price: 120, expiry: "2026-05-31" },
    { id: "8", name: "Panadol", category: "Pain Relief", quantity: 80, price: 30, expiry: "2026-11-30" }
  ];
}

function loadAll() {
  loadDrugs();
  loadSales();
  updateSalesTotals();
  updateInventoryStats();
  renderRecentSales();
}

function setCurrentDate() {
  const now = new Date();
  currentDateEl.textContent = now.toLocaleDateString("en-KE", { 
    weekday: "long", 
    year: "numeric", 
    month: "long", 
    day: "numeric" 
  });
}

// ===== Navigation =====
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  // Role-based access control - users can access Dashboard, Sell, Sales History
  if (!isAdmin()) {
    const userAllowedPages = ['dashboard', 'sell', 'sales'];
    if (!userAllowedPages.includes(page)) {
      page = 'dashboard';
    }
  }

  // Update nav
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  // Show page
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });
  document.getElementById(`${page}-page`).classList.add("active");

  // Refresh data
  if (page === "inventory") {
    renderInventory();
  } else if (page === "stock") {
    renderStock();
  } else if (page === "restock") {
    renderRestockPage();
  } else if (page === "expiry") {
    renderExpiryPage();
  }
}

// ===== Drugs =====
function loadDrugs() {
  renderDrugOptions(allDrugs);
}

function renderDrugOptions(drugs) {
  drugSelect.innerHTML = "";
  if (drugs.length === 0) {
    drugSelect.innerHTML = "<option>No drugs available</option>";
    return;
  }
  drugs.forEach(drug => {
    const option = document.createElement("option");
    option.value = drug.id;
    const stockWarning = (drug.quantity ?? 0) <= MIN_STOCK ? " (Low Stock!)" : "";
    option.textContent = `${drug.name} (${drug.category}) - ${drug.quantity ?? 0} left${stockWarning}`;
    if ((drug.quantity ?? 0) <= MIN_STOCK) option.style.color = "red";
    drugSelect.appendChild(option);
  });
}

// Filter drugs in dropdown
drugSearchInput.addEventListener("input", () => {
  const query = drugSearchInput.value.trim().toLowerCase();
  if (!query) return renderDrugOptions(allDrugs);
  const filtered = allDrugs.filter(d => 
    (d.name?.toLowerCase().includes(query)) ||
    (d.category?.toLowerCase().includes(query))
  );
  renderDrugOptions(filtered);
});

// ===== Sell Drug =====
function sellDrug() {
  const id = drugSelect.value;
  const qty = Number(qtyInput.value);
  
  if (!id || qty <= 0) {
    alert("Select drug and enter valid quantity");
    return;
  }

  const drug = allDrugs.find(d => d.id === id);
  if (!drug) {
    alert("Drug not found!");
    return;
  }

  if (drug.expiry && new Date(drug.expiry) < new Date()) {
    alert("Cannot sell expired drugs!");
    return;
  }
  if ((drug.quantity ?? 0) < qty) {
    alert("Not enough stock!");
    return;
  }

  const totalPrice = qty * (drug.price ?? 0);

  const sale = {
    id: Date.now().toString(),
    drugId: id,
    drugName: drug.name,
    category: drug.category,
    quantity: qty,
    price: drug.price,
    totalPrice,
    timestamp: new Date().toISOString(),
    deleted: false
  };

  allSales.push(sale);
  localStorage.setItem("sales", JSON.stringify(allSales));

  drug.quantity = (drug.quantity ?? 0) - qty;
  localStorage.setItem("drugs", JSON.stringify(allDrugs));

  alert(`Sold ${qty} x ${drug.name} for ${formatKsh(totalPrice)}`);
  qtyInput.value = "";
  drugSearchInput.value = "";
  
  loadDrugs();
  loadSales();
  updateSalesTotals();
  renderRecentSales();
  updateInventoryStats();
}

// ===== Sales =====
function loadSales() {
  const activeSales = allSales.filter(s => !s.deleted);
  renderSales(activeSales);
}

function renderSales(salesArray) {
  salesBody.innerHTML = "";
  const grouped = {};

  salesArray.forEach(sale => {
    const dateObj = sale.timestamp ? new Date(sale.timestamp) : new Date();
    const dateKey = dateObj.toLocaleDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push({ ...sale, dateObj });
  });

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  sortedDates.forEach(date => {
    // Date header row
    const headerRow = document.createElement("tr");
    headerRow.className = "date-group-header";
    const headerCell = document.createElement("td");
    headerCell.colSpan = 6;
    headerCell.innerHTML = `<i class="fa-solid fa-calendar"></i> ${date}`;
    headerRow.appendChild(headerCell);
    salesBody.appendChild(headerRow);

    // Sort by time
    grouped[date].sort((a, b) => b.dateObj - a.dateObj);

    grouped[date].forEach(sale => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sale.drugName || "N/A"}</td>
        <td>${sale.category || "N/A"}</td>
        <td>${sale.quantity ?? 0}</td>
        <td>${formatKsh(sale.totalPrice ?? 0)}</td>
        <td>${date}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="editSale('${sale.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="action-btn delete" onclick="deleteSale('${sale.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      `;
      salesBody.appendChild(row);
    });
  });

  if (salesArray.length === 0) {
    salesBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:40px;">No sales found</td></tr>';
  }
}

// Recent sales for dashboard
function renderRecentSales() {
  recentSalesBody.innerHTML = "";
  const activeSales = allSales.filter(s => !s.deleted);
  const recent = activeSales.slice(-5).reverse();
  
  recent.forEach(sale => {
    const date = new Date(sale.timestamp).toLocaleDateString();
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sale.drugName}</td>
      <td>${sale.category}</td>
      <td>${sale.quantity}</td>
      <td>${formatKsh(sale.totalPrice)}</td>
      <td>${date}</td>
    `;
    recentSalesBody.appendChild(row);
  });

  if (recent.length === 0) {
    recentSalesBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No recent sales</td></tr>';
  }
}

function editSale(id) {
  const sale = allSales.find(s => s.id === id);
  if (!sale) return;
  
  const newQty = Number(prompt("New quantity:", sale.quantity));
  if (!newQty || newQty <= 0) return;

  const drug = allDrugs.find(d => d.id === sale.drugId);
  if (!drug) return;

  let stock = (drug.quantity ?? 0) + (sale.quantity ?? 0);
  if (stock < newQty) { alert("Not enough stock!"); return; }
  stock -= newQty;
  const newTotal = newQty * (sale.price ?? 0);

  sale.quantity = newQty;
  sale.totalPrice = newTotal;
  drug.quantity = stock;

  localStorage.setItem("sales", JSON.stringify(allSales));
  localStorage.setItem("drugs", JSON.stringify(allDrugs));

  alert("Sale updated!");
  loadSales();
  loadDrugs();
  updateSalesTotals();
  renderRecentSales();
  updateInventoryStats();
}

function deleteSale(id) {
  if (!confirm("Delete this sale?")) return;
  
  const sale = allSales.find(s => s.id === id);
  if (!sale) return;

  const drug = allDrugs.find(d => d.id === sale.drugId);
  if (drug) {
    drug.quantity = (drug.quantity ?? 0) + (sale.quantity ?? 0);
  }

  sale.deleted = true;
  localStorage.setItem("sales", JSON.stringify(allSales));
  localStorage.setItem("drugs", JSON.stringify(allDrugs));

  alert("Sale deleted!");
  loadSales();
  loadDrugs();
  updateSalesTotals();
  renderRecentSales();
  updateInventoryStats();
}

// Sales filtering
filterSalesBtn.addEventListener("click", () => {
  const startVal = startDateInput.value;
  const endVal = endDateInput.value;
  if (!startVal || !endVal) { alert("Select both start and end dates."); return; }
  const start = new Date(startVal);
  const end = new Date(endVal); end.setHours(23,59,59,999);
  const filtered = allSales.filter(s => {
    if (s.deleted) return false;
    const saleDate = new Date(s.timestamp);
    return saleDate >= start && saleDate <= end;
  });
  renderSales(filtered);
});

clearSalesFilterBtn.addEventListener("click", () => {
  startDateInput.value = "";
  endDateInput.value = "";
  loadSales();
});

// ===== Stats =====
function updateSalesTotals() {
  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startYear = new Date(now.getFullYear(), 0, 1);
  const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

  let totalAll = 0, daily = 0, monthly = 0, yearly = 0;

  allSales.forEach(sale => {
    if (sale.deleted) return;
    const saleDate = new Date(sale.timestamp);
    totalAll += sale.totalPrice ?? 0;
    if (saleDate >= startDay && saleDate <= endDay) daily += sale.totalPrice ?? 0;
    if (saleDate >= startMonth && saleDate <= endMonth) monthly += sale.totalPrice ?? 0;
    if (saleDate >= startYear && saleDate <= endYear) yearly += sale.totalPrice ?? 0;
  });

  totalSalesEl.textContent = formatKsh(totalAll);
  dailyEl.textContent = formatKsh(daily);
  monthlyEl.textContent = formatKsh(monthly);
  yearlyEl.textContent = formatKsh(yearly);
}

// ===== Inventory =====
function renderInventory() {
  inventoryBody.innerHTML = "";
  
  allDrugs.forEach(drug => {
    const row = document.createElement("tr");
    const qty = drug.quantity ?? 0;
    let stockClass = "in-stock";
    if (qty === 0) stockClass = "out-of-stock";
    else if (qty <= MIN_STOCK) stockClass = "low-stock";
    
    row.innerHTML = `
      <td><strong>${drug.name}</strong></td>
      <td>${drug.category}</td>
      <td>${formatKsh(drug.price)}</td>
      <td><span class="stock-status ${stockClass}">${qty}</span></td>
      <td>${drug.expiry || "N/A"}</td>
      <td>
        <div class="action-btns">
          <button class="action-btn edit" onclick="openEditDrug('${drug.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="action-btn delete" onclick="deleteDrug('${drug.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    `;
    inventoryBody.appendChild(row);
  });

  if (allDrugs.length === 0) {
    inventoryBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:40px;">No drugs in inventory</td></tr>';
  }
}

function updateInventoryStats() {
  totalDrugsEl.textContent = allDrugs.length;
  const lowStock = allDrugs.filter(d => d.quantity <= MIN_STOCK).length;
  lowStockCountEl.textContent = lowStock;
  const totalValue = allDrugs.reduce((sum, d) => sum + (d.price * d.quantity), 0);
  totalValueEl.textContent = formatKsh(totalValue);
  renderInventory();
}

// ===== Modal Functions =====
function showAddDrugModal() {
  modalTitle.textContent = "Add New Drug";
  editDrugId.value = "";
  drugForm.reset();
  drugModal.classList.add("active");
}

function openEditDrug(id) {
  const drug = allDrugs.find(d => d.id === id);
  if (!drug) return;
  
  modalTitle.textContent = "Edit Drug";
  editDrugId.value = drug.id;
  document.getElementById("drugName").value = drug.name;
  document.getElementById("drugCategory").value = drug.category;
  document.getElementById("drugPrice").value = drug.price;
  document.getElementById("drugQuantity").value = drug.quantity;
  document.getElementById("drugExpiry").value = drug.expiry || "";
  drugModal.classList.add("active");
}

function closeModal() {
  drugModal.classList.remove("active");
}

function saveDrug(e) {
  e.preventDefault();
  
  const id = editDrugId.value;
  const name = document.getElementById("drugName").value;
  const category = document.getElementById("drugCategory").value;
  const price = Number(document.getElementById("drugPrice").value);
  const quantity = Number(document.getElementById("drugQuantity").value);
  const expiry = document.getElementById("drugExpiry").value;

  if (id) {
    // Edit existing
    const drug = allDrugs.find(d => d.id === id);
    if (drug) {
      drug.name = name;
      drug.category = category;
      drug.price = price;
      drug.quantity = quantity;
      drug.expiry = expiry || null;
    }
  } else {
    // Add new
    const newDrug = {
      id: Date.now().toString(),
      name,
      category,
      price,
      quantity,
      expiry: expiry || null
    };
    allDrugs.push(newDrug);
  }

  localStorage.setItem("drugs", JSON.stringify(allDrugs));
  closeModal();
  loadDrugs();
  updateInventoryStats();
}

function deleteDrug(id) {
  if (!confirm("Delete this drug from inventory?")) return;
  allDrugs = allDrugs.filter(d => d.id !== id);
  localStorage.setItem("drugs", JSON.stringify(allDrugs));
  loadDrugs();
  updateInventoryStats();
}

// ===== Utilities =====
function formatKsh(amount) {
  return "KSh " + (amount ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2 });
}

// ===== Role-Based Access Control =====
function updateNavByRole() {
    const role = getRole();
    const isUserAdmin = isAdmin();
    
    document.getElementById('userNavItems').style.display = isUserAdmin ? 'none' : 'flex';
    document.getElementById('adminNavItems').style.display = isUserAdmin ? 'flex' : 'none';
    document.getElementById('userInfoName').textContent = isUserAdmin ? 'Admin User' : 'Pharmacy User';
    
    const addDrugBtn = document.getElementById('addDrugNavBtn');
    if (addDrugBtn) {
        addDrugBtn.style.display = isUserAdmin ? 'flex' : 'none';
    }
    
    const inventoryAddBtn = document.getElementById('inventoryAddBtn');
    if (inventoryAddBtn) {
        inventoryAddBtn.style.display = isUserAdmin ? 'inline-flex' : 'none';
    }
}

function restrictPageAccess(page) {
    if (!isAdmin()) {
        const adminOnlyPages = ['dashboard', 'inventory', 'sales'];
        if (adminOnlyPages.includes(page)) {
            navigateTo('sell');
            return false;
        }
    }
    return true;
}

// ===== Role-Based UI Update =====
function setupRoleBasedUI() {
    setTimeout(() => {
        const role = getRole();
        window.currentRole = role;
        updateNavByRole();
        
        if (role !== 'admin') {
            navigateTo('sell');
        }
    }, 100);
}

// Make functions global
window.sellDrug = sellDrug;
window.editSale = editSale;
window.deleteSale = deleteSale;
window.showAddDrugModal = showAddDrugModal;
window.openEditDrug = openEditDrug;
window.closeModal = closeModal;
window.saveDrug = saveDrug;
window.deleteDrug = deleteDrug;
window.navigateTo = navigateTo;
window.logout = logout;
window.getRole = getRole;
window.isAdmin = isAdmin;
window.updateNavByRole = updateNavByRole;
window.restrictPageAccess = restrictPageAccess;
window.setupRoleBasedUI = setupRoleBasedUI;

// ===== Stock Available (Admin) =====
function renderStock() {
  const stockBody = document.getElementById('stockBody');
  if (!stockBody) return;
  
  stockBody.innerHTML = '';
  
  allDrugs.forEach(drug => {
    const qty = drug.quantity ?? 0;
    let statusClass = 'stock-high';
    let statusText = 'In Stock';
    
    if (qty === 0) {
      statusClass = 'stock-out';
      statusText = 'Out of Stock';
    } else if (qty <= 5) {
      statusClass = 'stock-low';
      statusText = 'Low Stock';
    } else if (qty <= 20) {
      statusClass = 'stock-medium';
      statusText = 'Medium';
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${drug.name}</strong></td>
      <td>${drug.category}</td>
      <td>${qty}</td>
      <td>${formatKsh(drug.price)}</td>
      <td><span class="stock-status ${statusClass}">${statusText}</span></td>
    `;
    stockBody.appendChild(row);
  });
  
  if (allDrugs.length === 0) {
    stockBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No drugs in stock</td></tr>';
  }
}

// Stock search
document.addEventListener('DOMContentLoaded', () => {
  const stockSearch = document.getElementById('stockSearch');
  if (stockSearch) {
    stockSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const rows = document.querySelectorAll('#stockBody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }
});

// ===== Restock (Admin) =====
function renderRestockPage() {
  const restockDrugSelect = document.getElementById('restockDrugSelect');
  const lowStockList = document.getElementById('lowStockList');
  const lowStockNotice = document.getElementById('lowStockNotice');
  
  if (!restockDrugSelect) return;
  
  restockDrugSelect.innerHTML = '<option value="">Select a drug to restock</option>';
  
  const lowStockItems = allDrugs.filter(d => d.quantity <= 5);
  
  if (lowStockItems.length > 0 && lowStockList) {
    lowStockNotice.style.display = 'block';
    lowStockList.innerHTML = lowStockItems.map(d => `<li>${d.name} - ${d.quantity} units</li>`).join('');
  } else if (lowStockNotice) {
    lowStockNotice.style.display = 'none';
  }
  
  allDrugs.forEach(drug => {
    const option = document.createElement('option');
    option.value = drug.id;
    option.textContent = `${drug.name} (${drug.quantity ?? 0} in stock)`;
    restockDrugSelect.appendChild(option);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const restockDrugSelect = document.getElementById('restockDrugSelect');
  const restockCurrentStock = document.getElementById('restockCurrentStock');
  const restockForm = document.getElementById('restockForm');
  
  if (restockDrugSelect && restockCurrentStock) {
    restockDrugSelect.addEventListener('change', (e) => {
      const drug = allDrugs.find(d => d.id === e.target.value);
      restockCurrentStock.value = drug ? (drug.quantity ?? 0) : 0;
    });
  }
  
  if (restockForm) {
    restockForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const drugId = document.getElementById('restockDrugSelect').value;
      const addQty = Number(document.getElementById('restockQuantity').value);
      
      if (!drugId || addQty <= 0) {
        alert('Please select drug and enter quantity');
        return;
      }
      
      const drug = allDrugs.find(d => d.id === drugId);
      if (drug) {
        drug.quantity = (drug.quantity ?? 0) + addQty;
        localStorage.setItem('drugs', JSON.stringify(allDrugs));
        alert(`Restocked ${addQty} units of ${drug.name}`);
        document.getElementById('restockQuantity').value = '';
        renderRestockPage();
        renderStock();
        updateInventoryStats();
      }
    });
  }
});

// ===== Expiry Dates (Admin) =====
function renderExpiryPage() {
  const expiryBody = document.getElementById('expiryBody');
  if (!expiryBody) return;
  
  expiryBody.innerHTML = '';
  
  const today = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  
  allDrugs.forEach(drug => {
    if (!drug.expiry) return;
    
    const expiryDate = new Date(drug.expiry);
    const daysLeft = Math.floor((expiryDate - today) / (24 * 60 * 60 * 1000));
    
    let statusClass = 'expiry-ok';
    let statusText = 'OK';
    
    if (daysLeft < 0) {
      statusClass = 'expiry-expired';
      statusText = 'Expired';
    } else if (daysLeft <= 30) {
      statusClass = 'expiry-soon';
      statusText = 'Expiring Soon';
    }
    
    const row = document.createElement('tr');
    row.dataset.status = daysLeft < 0 ? 'expired' : (daysLeft <= 30 ? 'soon' : 'ok');
    row.innerHTML = `
      <td><strong>${drug.name}</strong></td>
      <td>${drug.quantity ?? 0}</td>
      <td>${drug.expiry}</td>
      <td class="${statusClass}">${daysLeft}</td>
      <td><span class="status-badge status-${statusText.toLowerCase().replace(' ', '-')}">${statusText}</span></td>
    `;
    expiryBody.appendChild(row);
  });
  
  if (allDrugs.length === 0) {
    expiryBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:40px;">No drugs found</td></tr>';
  }
}

// Expiry filters
document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const filter = this.dataset.filter;
      const rows = document.querySelectorAll('#expiryBody tr');
      
      rows.forEach(row => {
        const status = row.dataset.status;
        if (filter === 'all' || status === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  });
});

// ===== Add Drug Page (Admin) =====
document.addEventListener('DOMContentLoaded', () => {
  const addDrugPageForm = document.getElementById('addDrugPageForm');
  if (addDrugPageForm) {
    addDrugPageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const name = document.getElementById('addDrugName').value;
      const category = document.getElementById('addDrugCategory').value;
      const price = Number(document.getElementById('addDrugPrice').value);
      const quantity = Number(document.getElementById('addDrugQuantity').value);
      const expiry = document.getElementById('addDrugExpiry').value;
      
      const newDrug = {
        id: Date.now().toString(),
        name,
        category,
        price,
        quantity,
        expiry: expiry || null
      };
      
      allDrugs.push(newDrug);
      localStorage.setItem('drugs', JSON.stringify(allDrugs));
      
      alert(`Drug "${name}" added successfully!`);
      addDrugPageForm.reset();
      loadDrugs();
      renderInventory();
      renderStock();
    });
  }
});

// Render admin pages when navigating
function loadAdminPages() {
  renderStock();
  renderRestockPage();
  renderExpiryPage();
}

// Close modal on outside click
drugModal.addEventListener("click", (e) => {
  if (e.target === drugModal) closeModal();
});