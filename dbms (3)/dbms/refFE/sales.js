document.addEventListener("DOMContentLoaded", function () {
    const salesData = JSON.parse(localStorage.getItem("salesData")) || [];
    const expiredItems = JSON.parse(localStorage.getItem("expiredItems")) || [];

    // Calculate totals
    const totalSold = salesData.reduce((sum, product) => sum + product.sold, 0);
    document.getElementById("total-sold").textContent = totalSold;
    document.getElementById("expired-products").textContent = expiredItems.length;

    // Category-wise analytics
    const categories = ["Dairy", "Frozen", "Beverages", "Vegetables", "Fruits", "Meat"];
    const categoryData = categories.map(category => {
        const sold = salesData.filter(p => p.category === category).reduce((sum, p) => sum + p.sold, 0);
        const expired = expiredItems.filter(p => p.category === category).length;
        return { category, sold, expired };
    });

    // Populate pie chart for category-wise sales
    const pieChartCtx = document.getElementById("category-pie-chart").getContext("2d");
    new Chart(pieChartCtx, {
        type: "pie",
        data: {
            labels: categories,
            datasets: [{
                label: "Products Sold by Category",
                data: categoryData.map(data => data.sold),
                backgroundColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
            }]
        }
    });

    // Populate bar chart for sales data
    const barChartCtx = document.getElementById("sales-bar-chart").getContext("2d");
    new Chart(barChartCtx, {
        type: "bar",
        data: {
            labels: categories,
            datasets: [
                {
                    label: "Sold Products",
                    data: categoryData.map(data => data.sold),
                    backgroundColor: "#36A2EB"
                },
                {
                    label: "Expired Products",
                    data: categoryData.map(data => data.expired),
                    backgroundColor: "#FF6384"
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Categories" } },
                y: { title: { display: true, text: "Quantity" } }
            }
        }
    });

    // Populate sales table
    const salesTableBody = document.querySelector("#sales-table tbody");
    salesData.forEach(product => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>${product.sold}</td>
            <td>--</td>
            <td>--</td>
        `;
        salesTableBody.appendChild(row);
    });

    // Update total products sold from localStorage
    function updateTotalSold() {
        let totalSold = 0;
        // Prefer using soldProducts array if available for accuracy
        const soldProducts = JSON.parse(localStorage.getItem("soldProducts") || "[]");
        if (soldProducts.length > 0) {
            totalSold = soldProducts.reduce((sum, p) => sum + (p.soldQuantity || 0), 0);
        } else {
            // Fallback to totalSold key if present
            totalSold = parseInt(localStorage.getItem("totalSold") || "0", 10);
        }
        document.getElementById("total-sold").textContent = totalSold;
    }

    updateTotalSold();
});
