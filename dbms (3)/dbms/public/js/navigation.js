const navigateTo = (page) => {
    event.preventDefault();
    history.pushState(null, '', page);
    loadContent(page);
};

const loadContent = async (page) => {
    const content = document.getElementById('main-content');
    try {
        const response = await fetch(page);
        const html = await response.text();
        content.innerHTML = html;
    } catch (error) {
        console.error('Navigation error:', error);
    }
};

window.addEventListener('popstate', () => {
    loadContent(window.location.pathname);
});
