function getHeaders() {
    const userId = sessionStorage.getItem('userId');
    return {
        'Content-Type': 'application/json',
        'user-id': userId
    };
}

// Example API call
async function fetchProducts() {
    try {
        const response = await fetch('/api/products', {
            headers: getHeaders()
        });
        if (!response.ok) {
            throw new Error('Failed to fetch products');
        }
        return await response.json();
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
