// Global variables
const productStats = {
    dairy: 0,
    frozen: 0,
    beverages: 0,
    vegetables: 0,
    fruits: 0,
    meat: 0
};

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Only initialize elements that exist on current page
    const statsElement = document.getElementById('total-products');
    if (statsElement) {
        try {
            const products = await loadProducts();
            updateStats(products);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Product name select element
    const productNameSelect = document.getElementById('name');
    if (productNameSelect) {
        productNameSelect.addEventListener('change', function () {
            const selectedProduct = this.value;
            const category = productCategoryMap[selectedProduct] || "";
            const categorySelect = document.getElementById('category');
            if (categorySelect) {
                categorySelect.value = category;
            }
        });
    }

    // Initialize login handlers
    const loginElements = document.querySelectorAll('[data-login-btn]');
    loginElements.forEach(el => {
        el.addEventListener('click', handleLogin);
    });
});

// Helper functions
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        const products = await response.json();
        return products;
    } catch (error) {
        console.error('Error loading products:', error);
        return [];
    }
}

function updateStats(products = []) {
    try {
        if (!Array.isArray(products)) {
            products = [];
        }

        // Reset stats
        Object.keys(productStats).forEach(key => productStats[key] = 0);

        // Count products by category
        products.forEach(product => {
            const category = product.category?.toLowerCase();
            if (productStats.hasOwnProperty(category)) {
                productStats[category]++;
            }
        });

        // Update DOM elements if they exist
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        updateElement("total-products", products.length);
        Object.keys(productStats).forEach(category => {
            updateElement(`${category}-count`, productStats[category]);
        });
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function handleLogin(e) {
    if (e) e.preventDefault();
    const returnUrl = window.location.pathname;
    localStorage.setItem('returnUrl', returnUrl);
    window.location.href = '/refFE/login.html';
}

function redirectToLogin() {
    localStorage.setItem('returnUrl', window.location.pathname);
    window.location.href = '/login.html';
}

// Check if user is logged in
async function checkAuth() {
    try {
        const response = await fetch('/api/check-auth', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.authenticated;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// Utility function for API requests
async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, {
                ...options,
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
}

// Sales data refresh function
async function refreshSalesData() {
    try {
        const data = await fetchWithRetry('/api/sales', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (data.success) {
            localStorage.setItem('salesData', JSON.stringify(data.sales));
            localStorage.setItem('lastUpdate', new Date().toISOString());
            return data.sales;
        } else {
            throw new Error(data.message || 'Failed to fetch sales data');
        }
    } catch (error) {
        console.error('Error refreshing sales data:', error);
        throw error;
    }
}

// Export functions for use in other files
window.loadProducts = loadProducts;
window.updateStats = updateStats;
window.refreshSalesData = refreshSalesData;
window.fetchWithRetry = fetchWithRetry;