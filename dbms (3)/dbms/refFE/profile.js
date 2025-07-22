document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        document.getElementById("user-name").textContent = user.name;
        document.getElementById("user-email").textContent = user.email;
        const image = localStorage.getItem("user-image") || `https://www.gravatar.com/avatar/${md5(user.email.trim().toLowerCase())}?d=identicon`;
        document.getElementById("user-image").src = image;
    }

    document.getElementById("image-upload").addEventListener("change", loadImage);
});

function loadImage(event) {
    const image = document.getElementById('user-image');
    image.src = URL.createObjectURL(event.target.files[0]);
    localStorage.setItem("user-image", image.src);
}

function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("user-image");
    alert('Logging out...');
    window.location.href = "signup-login.html";
}

function md5(string) {
    // Placeholder function for MD5 hashing
    // Replace with actual MD5 hashing implementation
    return string;
}
