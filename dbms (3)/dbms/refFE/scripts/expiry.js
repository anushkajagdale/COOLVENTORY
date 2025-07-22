function populateExpiringProducts(products) {
    const table = document.getElementById('expiring-soon-table').getElementsByTagName('tbody')[0];
    table.innerHTML = '';

    products.forEach(product => {
        const row = table.insertRow();
        const nameCell = row.insertCell(0);
        const categoryCell = row.insertCell(1);
        const quantityCell = row.insertCell(2);
        const unitCell = row.insertCell(3);
        const expiryCell = row.insertCell(4);
        const daysUntilExpiryCell = row.insertCell(5);

        nameCell.textContent = product.name;
        categoryCell.textContent = product.category;
        quantityCell.textContent = product.quantity;
        unitCell.textContent = product.unit;
        expiryCell.textContent = product.expiry;
        daysUntilExpiryCell.textContent = product.days_until_expiry;
    });

    // Remove clear all button visibility
    const clearAllButton = document.getElementById('clear-expiring-soon');
    if (clearAllButton) {
        clearAllButton.style.display = 'none';
    }
}

// Remove or comment out the clearExpiringSoon function if it exists
// function clearExpiringSoon() {
//     // Functionality removed
// }