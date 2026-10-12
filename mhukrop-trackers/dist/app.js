import { initialRestaurants } from './data.js';
let restaurants = [...initialRestaurants];
let isAdmin = false;
function renderRestaurants(data) {
    const grid = document.getElementById('restaurantGrid');
    const noResults = document.getElementById('noResults');
    const totalCountEl = document.getElementById('totalShopsCount');
    if (!grid)
        return;
    grid.innerHTML = '';
    if (totalCountEl) {
        totalCountEl.innerText = restaurants.filter(r => !r.isClosed).length + "+";
    }
    if (data.length === 0) {
        noResults?.classList.remove('hidden');
        return;
    }
    else {
        noResults?.classList.add('hidden');
    }
    data.forEach((shop) => {
        const card = document.createElement('div');
        card.className = `bg-[#13151c] rounded-2xl border border-[#232734] overflow-hidden shadow-xl hover:border-orange-500/50 transition duration-300 flex flex-col justify-between relative ${shop.isClosed ? 'opacity-50' : ''}`;
        const stars = '★'.repeat(Math.floor(shop.rating)) + (shop.rating % 1 >= 0.5 ? '½' : '');
        card.innerHTML = `
            <div>
                <div class="relative h-44 w-full overflow-hidden bg-gray-900">
                    <img src="${shop.image}" alt="${shop.name}" class="w-full h-full object-cover">
                    <div class="absolute top-3 left-3 bg-black/75 text-amber-400 font-bold text-xs px-2.5 py-1 rounded-lg border border-amber-400/30">
                        ${stars} ${shop.rating.toFixed(1)}
                    </div>
                    <div class="absolute top-3 right-3 crisp-badge text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                        🔥 กรอบ ${shop.crispness.toFixed(1)}/5
                    </div>
                    ${shop.badge ? `<div class="absolute bottom-3 left-3 bg-orange-600/90 text-white font-semibold text-[10px] px-2 py-0.5 rounded">${shop.badge}</div>` : ''}
                </div>
                <div class="p-4 space-y-3">
                    <div class="flex items-start justify-between">
                        <div>
                            <h4 class="text-base font-bold text-white">${shop.name}</h4>
                            <p class="text-xs text-orange-400 mt-0.5">ย่าน${shop.zone}</p>
                        </div>
                        ${isAdmin ? `
                            <button onclick="adminDeleteShop(${shop.id})" class="text-red-400 text-xs bg-red-950/50 p-1.5 rounded-lg border border-red-800">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="bg-[#1a1d26] p-2.5 rounded-xl border border-[#252936]">
                        <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">เมนูเด็ดแนะนำ:</span>
                        <p class="text-xs font-bold text-amber-400">${shop.menu}</p>
                    </div>
                    ${shop.reviews.length > 0 ? `
                        <div class="bg-[#1a1d26]/80 p-2.5 rounded-xl text-xs text-gray-300 border border-[#252936] italic">
                            "${shop.reviews[0].comment}"
                            <span class="block text-[10px] text-orange-400 font-normal not-italic mt-1 text-right">— ${shop.reviews[0].reviewer}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="p-4 pt-0 mt-2 flex items-center space-x-2">
                <button onclick="openReviewModal(${shop.id}, '${shop.name}')" class="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1">
                    <i class="fa-solid fa-pen"></i>
                    <span>เขียนรีวิว</span>
                </button>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.name + ' ' + shop.address)}" target="_blank" class="bg-[#1a1d26] text-gray-200 px-3 py-2 rounded-xl text-xs border border-[#2a2f3d]">
                    <i class="fa-solid fa-map-location-dot"></i>
                </a>
            </div>
        `;
        grid.appendChild(card);
    });
}
export function syncSearch(value) {
    const headerInput = document.getElementById('headerSearchInput');
    const mainInput = document.getElementById('mainSearchInput');
    if (headerInput)
        headerInput.value = value;
    if (mainInput)
        mainInput.value = value;
    filterRestaurants();
}
export function filterRestaurants() {
    const mainSearchInput = document.getElementById('mainSearchInput');
    const zoneFilter = document.getElementById('zoneFilter');
    const crispFilter = document.getElementById('crispFilter');
    const sortBy = document.getElementById('sortBy');
    const query = (mainSearchInput?.value || '').toLowerCase().trim();
    const zone = zoneFilter?.value || 'ALL';
    const minCrisp = parseFloat(crispFilter?.value || '0');
    const sortVal = sortBy?.value || 'rating';
    let filtered = restaurants.filter(shop => {
        if (shop.isClosed && !isAdmin)
            return false;
        const matchesQuery = shop.name.toLowerCase().includes(query) ||
            shop.address.toLowerCase().includes(query) ||
            shop.zone.toLowerCase().includes(query) ||
            shop.menu.toLowerCase().includes(query);
        const matchesZone = (zone === 'ALL') || shop.zone.includes(zone);
        const matchesCrisp = shop.crispness >= minCrisp;
        return matchesQuery && matchesZone && matchesCrisp;
    });
    filtered.sort((a, b) => {
        if (sortVal === 'rating')
            return b.rating - a.rating;
        if (sortVal === 'crispness')
            return b.crispness - a.crispness;
        if (sortVal === 'name')
            return a.name.localeCompare(b.name, 'th');
        return 0;
    });
    renderRestaurants(filtered);
}
export function resetFilters() {
    syncSearch('');
    const zoneFilter = document.getElementById('zoneFilter');
    const crispFilter = document.getElementById('crispFilter');
    const sortBy = document.getElementById('sortBy');
    if (zoneFilter)
        zoneFilter.value = 'ALL';
    if (crispFilter)
        crispFilter.value = '0';
    if (sortBy)
        sortBy.value = 'rating';
    filterRestaurants();
}
export function openModal(id) {
    document.getElementById(id)?.classList.remove('hidden');
}
export function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}
export function openDrawer(id) {
    document.getElementById(id)?.classList.remove('translate-x-full');
}
export function closeDrawer(id) {
    document.getElementById(id)?.classList.add('translate-x-full');
}
export function scrollToGrid() {
    document.getElementById('mainGrid')?.scrollIntoView({ behavior: 'smooth' });
}
export function openQuickReview() {
    if (restaurants.length > 0) {
        openReviewModal(restaurants[0].id, restaurants[0].name);
    }
}
export function openReviewModal(shopId, shopName) {
    const reviewShopIdInput = document.getElementById('reviewShopId');
    const reviewShopTitle = document.getElementById('reviewShopTitle');
    if (reviewShopIdInput)
        reviewShopIdInput.value = shopId.toString();
    if (reviewShopTitle)
        reviewShopTitle.innerText = `ร้าน: ${shopName}`;
    openModal('addReviewModal');
}
export function submitReview(e) {
    e.preventDefault();
    const shopIdInput = document.getElementById('reviewShopId');
    const nameInput = document.getElementById('reviewerName');
    const ratingSelect = document.getElementById('reviewRating');
    const crispSelect = document.getElementById('reviewCrisp');
    const commentInput = document.getElementById('reviewComment');
    if (!shopIdInput || !nameInput || !ratingSelect || !crispSelect || !commentInput)
        return;
    const shopId = parseInt(shopIdInput.value);
    const targetShop = restaurants.find(r => r.id === shopId);
    if (targetShop) {
        const newReview = {
            reviewer: nameInput.value,
            rating: parseFloat(ratingSelect.value),
            crisp: parseFloat(crispSelect.value),
            comment: commentInput.value
        };
        targetShop.reviews.unshift(newReview);
        alert(`[201 Created] เพิ่มรีวิวของคุณเข้าสู่ฐานข้อมูลร้าน ${targetShop.name} สำเร็จ!`);
        closeModal('addReviewModal');
        filterRestaurants();
    }
}
export function submitNewShop(e) {
    e.preventDefault();
    const nameInput = document.getElementById('newShopName');
    const zoneInput = document.getElementById('newShopZone');
    const menuInput = document.getElementById('newShopMenu');
    const addressInput = document.getElementById('newShopAddress');
    if (!nameInput || !zoneInput || !menuInput || !addressInput)
        return;
    const newShop = {
        id: restaurants.length + 1,
        name: nameInput.value,
        zone: zoneInput.value,
        address: addressInput.value,
        rating: 4.0,
        crispness: 4.5,
        menu: menuInput.value,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop",
        badge: "ร้านแจ้งเพิ่มใหม่",
        isClosed: false,
        reviews: [{ reviewer: "สมาชิกส่งข้อมูล", rating: 4.0, crisp: 4.5, comment: "แจ้งเพิ่มร้านใหม่เข้าสู่ฐานข้อมูล" }]
    };
    restaurants.unshift(newShop);
    alert(`[201 Created] ส่งข้อมูลร้าน "${nameInput.value}" เรียบร้อยแล้ว!`);
    closeModal('addShopModal');
    resetFilters();
}
export function toggleAdminMode() {
    isAdmin = !isAdmin;
    alert(isAdmin ? "เปิดใช้งานโหมดผู้ดูแลระบบ (Admin Mode)" : "กลับสู่โหมดผู้ใช้ทั่วไป");
    filterRestaurants();
}
export function adminDeleteShop(id) {
    if (confirm("คุณต้องการลบร้านนี้ออกใช่หรือไม่?")) {
        const shop = restaurants.find(r => r.id === id);
        if (shop) {
            shop.isClosed = true;
            filterRestaurants();
        }
    }
}
window.syncSearch = syncSearch;
window.filterRestaurants = filterRestaurants;
window.resetFilters = resetFilters;
window.openModal = openModal;
window.closeModal = closeModal;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;
window.scrollToGrid = scrollToGrid;
window.openQuickReview = openQuickReview;
window.openReviewModal = openReviewModal;
window.submitReview = submitReview;
window.submitNewShop = submitNewShop;
window.toggleAdminMode = toggleAdminMode;
window.adminDeleteShop = adminDeleteShop;
window.addEventListener('DOMContentLoaded', () => {
    renderRestaurants(restaurants);
});
