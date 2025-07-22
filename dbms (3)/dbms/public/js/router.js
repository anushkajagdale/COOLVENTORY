let currentPage = null;

const router = {
    init() {
        window.addEventListener('popstate', () => this.navigate(window.location.pathname));
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href]')) {
                e.preventDefault();
                this.navigate(e.target.getAttribute('href'));
            }
        });
        this.navigate(window.location.pathname);
    },

    async navigate(path) {
        const content = document.getElementById('content');
        content.classList.add('loading');

        try {
            const response = await fetch(path);
            const html = await response.text();

            setTimeout(() => {
                content.innerHTML = html;
                content.classList.remove('loading');
                history.pushState(null, '', path);
            }, 300);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => router.init());
