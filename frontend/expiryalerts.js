document.addEventListener("DOMContentLoaded", function () {
    loadExpiredItems();
});

function loadExpiredItems() {
    const expiredItems = JSON.parse(localStorage.getItem("expiredItems")) || [];
    const expiredTableBody = document.querySelector("#expired-items-table tbody");
    expiredTableBody.innerHTML = "";

    expiredItems.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.quantity}</td>
            <td>${item.expiry}</td>
        `;
        expiredTableBody.appendChild(row);
    });

    document.getElementById("expired-count").textContent = `Expired Products: ${expiredItems.length}`;
}
