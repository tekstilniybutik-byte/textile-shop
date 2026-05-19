import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://hsrfoepbcoyouvtobjhx.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzcmZvZXBiY295b3V2dG9iamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTYwMzUsImV4cCI6MjA5NDIzMjAzNX0.10GQQM59H5cm_km4Ru4d5Dz0JRXw4Zz3LU1yaNsoVkA'; 

const supabase = createClient(supabaseUrl, supabaseKey);

// --- ГЛОБАЛЬНІ ЗМІННІ ---
const productsGrid = document.getElementById('products-grid');
let allProducts = []; 
const categoriesDict = { 'postil': 'Постільна білизна', 'rushnyky': 'Рушники', 'pledy': 'Пледи', 'dekor': 'Декор', 'kids': 'Дитяча колекція 🧸', 'pokryvala': 'Покривала', 'kovdry': 'Ковдри' };

let myCart = JSON.parse(localStorage.getItem('shop_cart')) || [];
let currentProduct = null;
let currentVariation = null;
let currentQty = 1;

// ОСЬ ЦЕЙ РЯДОК БУВ ПРОПУЩЕНИЙ:
let currentCategory = 'all'; 
let currentPage = 1; // Поточна сторінка
const itemsPerPage = 6; // Скільки товарів показувати (можете змінити на 8 чи 10) 

// --- ІНІЦІАЛІЗАЦІЯ ПРИ ЗАВАНТАЖЕННІ ---
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartUI();

    // -- Меню (Бургер) --
    const burgerBtn = document.getElementById('burger-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    function toggleMenu() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }

    if (burgerBtn) burgerBtn.addEventListener('click', toggleMenu);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    document.querySelectorAll('.cat-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const cat = e.target.getAttribute('data-category');
            if (!cat) return; 
            e.preventDefault();
            document.querySelectorAll('.cat-link').forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            renderProducts(cat);
            toggleMenu();
            document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // -- Кошик (відкриття/закриття) --
    const cartOverlay = document.getElementById('cart-overlay');
    const cartPanel = document.getElementById('cart-panel');
    const closeCartBtn = document.getElementById('close-cart');
    const cartBtn = document.querySelector('.cart-btn');

    function openCart() {
        if(cartOverlay) cartOverlay.classList.add('show');
        if(cartPanel) cartPanel.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeCart() {
        if(cartOverlay) cartOverlay.classList.remove('show');
        if(cartPanel) cartPanel.classList.remove('open');
        document.body.style.overflow = '';
    }
    
    if (cartBtn) cartBtn.addEventListener('click', (e) => { e.preventDefault(); openCart(); });
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    // -- Додавання в кошик з модалки --
    // -- Додавання в кошик з модалки --
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (!currentProduct || !currentVariation) return;

            let finalPrice = currentVariation.price;
            if (currentQty >= 2 && currentVariation.bulk_price) finalPrice = currentVariation.bulk_price;
            else if (currentVariation.sale_price) finalPrice = currentVariation.sale_price;

            // ГЕНЕРУЄМО ПОСИЛАННЯ НА ТОВАР
            const cleanArt = currentProduct.sku ? String(currentProduct.sku).replace('#', '') : '';
            const productLink = window.location.origin + window.location.pathname + '?art=' + cleanArt;

            const newItem = {
                title: currentProduct.title,
                variation: currentVariation.name || "Стандартна",
                price: finalPrice,
                qty: currentQty,
                art: currentProduct.sku || "Без артикулу",
                img: currentProduct.image_url,
                link: productLink,
                components: currentVariation.components || [] // ТЕПЕР КОШИК ЗАПАМ'ЯТАЄ ДЕТАЛІ!
            };

            myCart.push(newItem);
            saveCartToStorage();
            updateCartUI();

            const cartIconBtn = document.querySelector('.cart-btn');
            if (cartIconBtn) {
                cartIconBtn.classList.add('cart-bounce');
                setTimeout(() => cartIconBtn.classList.remove('cart-bounce'), 400);
            }

            // ПРИБИРАЄМО ЛАГИ: Спочатку закриваємо модалку...
            window.closeModal();
            
            // ...і лише через 350 мілісекунд відкриваємо кошик (щоб телефон не "задихався" від двох анімацій)
            setTimeout(() => {
                openCart();
            }, 350);
        });
    }

    // -- Перемикач доставки (Нова Пошта / Укрпошта) --
    const deliveryRadios = document.querySelectorAll('input[name="delivery-service"]');
    const npTypeBlock = document.getElementById('np-type-block');
    const fopBlock = document.querySelector('.mono-details'); 
    const branchInput = document.getElementById('client-branch');
    const ukrHint = document.getElementById('ukrposhta-hint');

    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Укрпошта') {
                if (npTypeBlock) npTypeBlock.style.display = 'none';
                if (fopBlock) fopBlock.style.display = 'none';
                if (ukrHint) ukrHint.style.display = 'block';
                if (branchInput) branchInput.placeholder = "Поштовий індекс (Укрпошта)";
            } else {
                if (npTypeBlock) npTypeBlock.style.display = 'block';
                if (fopBlock) fopBlock.style.display = 'block';
                if (ukrHint) ukrHint.style.display = 'none';
                if (branchInput) branchInput.placeholder = "Номер відділення або поштомату";
            }
        });
    });

    // -- Кнопки замовлення --
    document.getElementById('btn-telegram')?.addEventListener('click', () => sendOrder('telegram'));
    document.getElementById('btn-viber')?.addEventListener('click', () => sendOrder('viber'));
});

// --- ЗАВАНТАЖЕННЯ ТОВАРІВ ---
async function loadProducts() {
    // Скачуємо всі товари, які є в наявності
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true);

    if (error) {
        if(productsGrid) productsGrid.innerHTML = `<p style="color:red; text-align:center;">Помилка: ${error.message}</p>`;
        return;
    }
    
    if (!data || data.length === 0) {
        if(productsGrid) productsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">Товари скоро з\'являться!</p>';
        return;
    }

    // --- 🎲 МАГІЯ: РАНДОМНЕ ПЕРЕМІШУВАННЯ ТОВАРІВ (Fisher-Yates) ---
    for (let i = data.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        // Міняємо товари місцями у випадковому порядку
        [data[i], data[j]] = [data[j], data[i]]; 
    }

    // Зберігаємо вже перемішаний список і малюємо його на екрані
    allProducts = data;
    renderProducts('all');
    
    // Перевіряємо посилання тільки після того, як товари завантажені
    checkUrlParams(); 
}

function renderProducts(categoryFilter, page = 1) {
    if (!productsGrid) return;
    currentCategory = categoryFilter; 
    currentPage = page; // Оновлюємо поточну сторінку
    productsGrid.innerHTML = '';
    
    const searchInput = document.getElementById('search-input');
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
    
    const clearBtn = document.getElementById('clear-search');
    if (clearBtn) {
        clearBtn.style.display = searchQuery ? 'block' : 'none';
    }

    // ФІЛЬТРАЦІЯ
    let filteredData = allProducts;
    if (categoryFilter !== 'all') {
        filteredData = allProducts.filter(p => p.category === categoryFilter);
    }
    if (searchQuery) {
        filteredData = filteredData.filter(p => 
            p.title.toLowerCase().includes(searchQuery) || 
            (p.sku && String(p.sku).toLowerCase().includes(searchQuery)) ||
            (p.material && p.material.toLowerCase().includes(searchQuery))
        );
    }

    if (filteredData.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1; color: #8e8e93; margin-top: 20px; font-weight: 500;">Нічого не знайдено за вашим запитом 🔍</p>';
        renderPagination(0);
        return;
    }

    // --- ПАГІНАЦІЯ (Ріжемо масив) ---
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex); // Беремо тільки 6 товарів

    // ВИВІД КАРТОК НА ЕКРАН
    paginatedData.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let priceText = `${product.price} ₴`;
        if (product.variations && product.variations.length > 1) {
            priceText = `від ${product.price} ₴`;
        }

        const catName = categoriesDict[product.category] || product.category;
        const materialHTML = product.material ? `<div class="product-material">🧵 ${product.material}</div>` : '';

        card.innerHTML = `
            <div class="product-image-wrap">
                <img src="${product.image_url}" alt="${product.title}" loading="lazy">
            </div>
            <div class="product-info">
                <span class="product-category">${catName}</span>
                <h3 class="product-title">${product.title}</h3>
                ${materialHTML} <div class="product-price">${priceText}</div>
                <button class="buy-btn" data-id="${product.id}">Переглянути</button>
            </div>
        `;
        card.addEventListener('click', () => window.openProductModal(product.id));
        productsGrid.appendChild(card);
    });

    // Малюємо кнопки сторінок
    renderPagination(totalPages);
}

// НОВА ФУНКЦІЯ: Малює кнопки (1, 2, 3...)
function renderPagination(totalPages) {
    const pagContainer = document.getElementById('pagination-container');
    if (!pagContainer) return;
    pagContainer.innerHTML = '';

    if (totalPages <= 1) return; // Якщо товарів мало, ховаємо кнопки

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => {
            renderProducts(currentCategory, i);
            // Плавний скрол вгору каталогу при перемиканні сторінки
            document.getElementById('catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        pagContainer.appendChild(btn);
    }
}

// СЛУХАЧІ ПОДІЙ ДЛЯ РЯДКА ПОШУКУ
// СЛУХАЧІ ПОДІЙ ДЛЯ РЯДКА ПОШУКУ (ОПТИМІЗОВАНО З DEBOUNCE)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');

    // Функція-запобіжник (Debounce): чекає, поки клієнт перестане швидко друкувати
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    if (searchInput) {
        // Пошук спрацює лише через 300мс після того, як ви ввели останню літеру
        const optimizedSearch = debounce(() => {
            renderProducts(currentCategory, 1);
        }, 300);

        searchInput.addEventListener('input', optimizedSearch);
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            renderProducts(currentCategory, 1);
            searchInput.focus(); 
        });
    }
});

function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const art = urlParams.get('art');
    if (art) {
        const cleanArt = art.replace('#', '').trim();
        const product = allProducts.find(p => (p.sku && String(p.sku).replace('#', '') === cleanArt));
        if (product) window.openProductModal(product.id);
    }
}

// --- ЛОГІКА МОДАЛЬНОГО ВІКНА ---
window.openProductModal = function(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    currentProduct = product;
    currentQty = 1;
    document.getElementById('modal-qty').innerText = currentQty;

    document.getElementById('modal-img').src = product.image_url;
    // --- МАГІЯ ГАЛЕРЕЇ ---
    // Беремо масив фотографій або створюємо його з одного головного фото
    const productImages = (product.images && product.images.length > 0) ? product.images : [product.image_url];
    
    // Встановлюємо перше фото
    document.getElementById('modal-img').src = productImages[0];
    
    const thumbsContainer = document.getElementById('modal-gallery-thumbs');
    if (thumbsContainer) {
        if (productImages.length > 1) {
            // Якщо фото більше одного - малюємо мініатюри
            thumbsContainer.innerHTML = productImages.map((img, idx) => `
                <img src="${img}" class="modal-thumb ${idx === 0 ? 'active' : ''}" onclick="window.changeMainImage('${img}', this)">
            `).join('');
        } else {
            // Якщо фото одне - ховаємо стрічку
            thumbsContainer.innerHTML = ''; 
        }
    }
    document.getElementById('modal-title').innerText = product.title;
    document.getElementById('modal-art').innerText = product.sku ? `Арт: #${product.sku}` : 'Арт: —';
    document.getElementById('modal-desc').innerText = product.description || '';

    const varsContainer = document.getElementById('modal-variations');
    const varsWrapper = document.getElementById('variations-wrapper');
    varsContainer.innerHTML = '';

    if (product.variations && product.variations.length > 0) {
        if (product.variations.length > 1 || product.variations[0].name) {
            varsWrapper.style.display = 'block';
            product.variations.forEach((v, index) => {
                const chip = document.createElement('div');
                chip.className = `v-chip ${index === 0 ? 'active' : ''}`;
                chip.innerText = v.name || 'Стандарт';
                chip.onclick = () => {
                    document.querySelectorAll('.v-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    currentVariation = v;
                    updateModalDisplayPrice();
                };
                varsContainer.appendChild(chip);
            });
            currentVariation = product.variations[0];
        } else {
            varsWrapper.style.display = 'none';
            currentVariation = product.variations[0];
        }
    } else {
        varsWrapper.style.display = 'none';
        currentVariation = { price: product.price, sale_price: product.sale_price, bulk_price: product.bulk_price };
    }

    updateModalDisplayPrice();
    
    // ОСЬ ТУТ БУЛА ПОМИЛКА ІЗ ЗАВИСАННЯМ. Тепер вікно відкривається правильно:
    document.getElementById('product-modal').classList.add('show');
    document.body.style.overflow = 'hidden';

    const url = new URL(window.location.href);
    url.searchParams.set('art', product.sku || '');
    window.history.pushState({}, '', url);
    // --- МАГІЯ ДЛЯ ВІДОБРАЖЕННЯ КОМПЛЕКТАЦІЇ ---
    const compContainer = document.getElementById('modal-components-container');
    if (compContainer) {
        // Перевіряємо, чи є у цієї варіації деталі (components)
        if (currentVariation && currentVariation.components && currentVariation.components.length > 0) {
            let compsHTML = '<span style="font-weight: 700; color: #2D3436; font-size: 14px; display: block; margin-bottom: 8px;">📦 У наборі:</span><ul style="padding-left: 20px; margin: 0; color: #636E72; font-size: 13.5px; line-height: 1.6;">';
            
            // Перебираємо кожну деталь і малюємо її
            currentVariation.components.forEach(c => {
                const sizeText = c.size ? ` <span style="opacity: 0.8;">(${c.size})</span>` : '';
                compsHTML += `<li>${c.name}${sizeText} — <strong>${c.qty} шт.</strong></li>`;
            });
            
            compsHTML += '</ul>';
            compContainer.innerHTML = compsHTML;
            compContainer.style.display = 'block'; // Показуємо блок
        } else {
            compContainer.style.display = 'none'; // Ховаємо, якщо деталей немає
        }
    }
};

window.changeQty = function(delta) {
    currentQty += delta;
    if (currentQty < 1) currentQty = 1;
    document.getElementById('modal-qty').innerText = currentQty;
    updateModalDisplayPrice();
};

function updateModalDisplayPrice() {
    if (!currentVariation) return;
    const priceElement = document.getElementById('modal-price');
    const totalElement = document.getElementById('modal-total-price');
    const sizeElement = document.getElementById('modal-size-value'); 
    const sizeWrapper = document.getElementById('modal-size-wrapper');
    // Знаходимо блок комплектації
    const compContainer = document.getElementById('modal-components-container'); 

    let basePrice = currentVariation.sale_price ? currentVariation.sale_price : currentVariation.price;
    let bulkPrice = currentVariation.bulk_price;
    let finalPrice = basePrice;

    if (currentQty >= 2 && bulkPrice) {
        finalPrice = bulkPrice;
        priceElement.innerHTML = `${finalPrice} ₴`;
    } else {
        finalPrice = basePrice;
        let priceHTML = '';
        if (currentVariation.sale_price) {
            priceHTML += `<span style="text-decoration: line-through; color: #8e8e93; font-size: 16px; margin-right: 8px;">${currentVariation.price} ₴</span>`;
        }
        priceHTML += `${finalPrice} ₴`;
        if (bulkPrice) {
            priceHTML += `<span style="font-size: 13px; color: #27ae60; font-weight: 600; padding: 4px 8px; background: #e8f8f5; border-radius: 8px; margin-left: 12px; vertical-align: middle;">від 2-х од. ${bulkPrice} ₴</span>`;
        }
        priceElement.innerHTML = priceHTML;
    }

    if (totalElement) totalElement.innerText = `${finalPrice * currentQty} ₴`;

    if (sizeElement && sizeWrapper) {
        const vName = currentVariation.name ? currentVariation.name.trim() : '';
        const isDefaultName = !vName || vName.toLowerCase().includes('стандарт');
        const isOnlyOneVariation = currentProduct && currentProduct.variations && currentProduct.variations.length <= 1;

        if (isDefaultName && isOnlyOneVariation) {
            sizeWrapper.style.display = 'none';
        } else {
            sizeWrapper.style.display = 'block';
            sizeElement.textContent = vName || 'Один розмір'; 
        }
    }

    // --- МАГІЯ: ДИНАМІЧНЕ ОНОВЛЕННЯ КОМПЛЕКТАЦІЇ ---
    if (compContainer) {
        if (currentVariation && currentVariation.components && currentVariation.components.length > 0) {
            let compsHTML = '<span style="font-weight: 700; color: #2D3436; font-size: 14px; display: block; margin-bottom: 8px;">📦 У наборі:</span><ul style="padding-left: 20px; margin: 0; color: #636E72; font-size: 13.5px; line-height: 1.6;">';
            currentVariation.components.forEach(c => {
                const sizeText = c.size ? ` <span style="opacity: 0.8;">(${c.size})</span>` : '';
                compsHTML += `<li>${c.name}${sizeText} — <strong>${c.qty} шт.</strong></li>`;
            });
            compsHTML += '</ul>';
            compContainer.innerHTML = compsHTML;
            compContainer.style.display = 'block';
        } else {
            compContainer.style.display = 'none';
        }
    }
}
window.closeModal = function() {
    document.getElementById('product-modal').classList.remove('show');
    document.body.style.overflow = '';
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
};

// Закриття по кліку на темний фон
document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'product-modal') window.closeModal();
});

// --- ЛОГІКА КОШИКА ---
function saveCartToStorage() {
    localStorage.setItem('shop_cart', JSON.stringify(myCart));
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCountElements = document.querySelectorAll('.cart-count');
    const cartTotalElement = document.getElementById('cart-total-sum');

    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let totalQty = 0;

    if (myCart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: #8e8e93; margin-top: 40px; font-weight: bold;">Кошик порожній 😔</p>';
    } else {
        myCart.forEach((item, index) => {
            const price = parseInt(item.price) || 0;
            const qty = item.qty || 1;
            total += price * qty;
            totalQty += qty;

            const itemHtml = `
                <div class="cart-item-card" style="display: flex; gap: 12px; background: #fff; padding: 12px; border-radius: 16px; margin-bottom: 10px; border: 1px solid #f0f0f0;">
                    <img src="${item.img}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 12px;">
                    <div class="cart-item-info" style="flex: 1;">
                        <div class="cart-item-title" style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${item.title}</div>
                        <div style="font-size: 11px; color: #8e8e93;">Арт: ${item.art} • ${item.variation}</div>
                        <div style="display:flex; justify-content: space-between; align-items:center; margin-top: 4px;">
                            <div style="font-weight: 800; font-size: 16px;">${price} ₴</div>
                            <div style="font-size: 13px; color: #8e8e93; font-weight: bold;">${qty} шт.</div>
                        </div>
                    </div>
                    <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#FF477E; font-size:18px; cursor:pointer; padding:5px;">✖</button>
                </div>
            `;
            cartItemsContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
    }

    cartCountElements.forEach(el => el.textContent = totalQty);
    if (cartTotalElement) cartTotalElement.textContent = `${total} ₴`;
}

window.removeFromCart = function(index) {
    myCart.splice(index, 1);
    saveCartToStorage();
    updateCartUI();
};

// --- ВІДПРАВКА ЗАМОВЛЕННЯ ---
// --- ВІДПРАВКА ЗАМОВЛЕННЯ ---
// --- ВІДПРАВКА ЗАМОВЛЕННЯ (ПРЯМА ВЕРСІЯ З АВТОЗАПОВНЕННЯМ) ---
// --- ВІДПРАВКА ЗАМОВЛЕННЯ (ПРЯМА ВЕРСІЯ З АВТОЗАПОВНЕННЯМ) ---
window.sendOrder = function(platform) {
    const nameInput = document.getElementById('client-name');
    const phoneInput = document.getElementById('client-phone');
    const cityInput = document.getElementById('client-city');
    const branchInput = document.getElementById('client-branch');

    const name = nameInput ? nameInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const city = cityInput ? cityInput.value.trim() : '';
    const branch = branchInput ? branchInput.value.trim() : '';

    if (!name || !phone) {
        showToast("Увага!", "Будь ласка, введіть ПІБ та номер телефону.", "error");
        return;
    }
    
    if (myCart.length === 0) {
        showToast("Кошик порожній", "Додайте товари, щоб зробити замовлення 🛍️", "error");
        return;
    }

    const deliveryService = document.querySelector('input[name="delivery-service"]:checked')?.value || 'Нова Пошта';
    const deliveryType = document.querySelector('input[name="np-type"]:checked')?.value || 'Відділення';

    let itemsText = "";
    let totalSum = 0;
    
    // Формуємо список товарів разом із деталями комплектації
    myCart.forEach((item, index) => {
        const itemQty = item.qty || 1;
        itemsText += `${index + 1}. ${item.title} ${item.variation !== 'Стандартна' ? '('+item.variation+')' : ''} — ${item.price} ₴ x ${itemQty} шт\n`;
        
        if (item.components && item.components.length > 0) {
            itemsText += `   📦 У наборі:\n`;
            item.components.forEach(c => {
                itemsText += `     - ${c.name} ${c.size ? '('+c.size+')' : ''} - ${c.qty} шт.\n`;
            });
        }
        
        itemsText += `   Арт: ${item.art}\n`;
        if (item.link) itemsText += `   🔗 Посилання: ${item.link}\n`; 
        
        totalSum += item.price * itemQty;
    });

    let message = `🛍️ НОВЕ ЗАМОВЛЕННЯ\n\n`;
    message += `👤 Покупець: ${name}\n`;
    message += `📞 Тел: ${phone}\n\n`;
    
    if (deliveryService === 'Укрпошта') {
        message += `📍 Доставка: Укрпошта\n   Місто: ${city}\n   Індекс: ${branch}\n💳 Оплата: При отриманні (Без передплати)\n\n`;
    } else {
        message += `📍 Доставка: Нова Пошта (${deliveryType})\n   Місто: ${city}\n   №: ${branch}\n💳 Передплата: за реквізитами ФОП\n\n`;
    }

    message += `📦 Товари:\n${itemsText}\n`;
    message += `💰 Разом: ${totalSum} ₴\n`;

    // 1. Зберігаємо в базу даних
    const orderItemsForDb = myCart.map(item => ({
        title: item.title,
        variation: item.variation,
        price: item.price,
        qty: item.qty,
        art: item.art,
        img: item.img
    }));

    supabase.from('orders').insert([{
        client_name: name,
        client_phone: phone,
        client_city: city,
        client_branch: branch,
        delivery_service: deliveryService,
        delivery_type: deliveryType,
        total_sum: totalSum,
        items: orderItemsForDb,
        status: 'Нове'
    }]).then(({ error }) => {
        if (error) console.error("Помилка збереження в БД:", error.message);
    });

    // 2. Уніфікована логіка копіювання для обох месенджерів
    const myPhone = "380984165936"; 
    const tgUsername = "AllaVerba1"; 

    navigator.clipboard.writeText(message).then(() => {
        showToast("Дані збережено! ✨", "Просто затисніть поле вводу у месенджері та натисніть «Вставити».", "info");
        
        setTimeout(() => {
            if (platform === 'telegram') {
                window.location.href = `tg://resolve?domain=${tgUsername}`;
            } else if (platform === 'viber') {
                window.location.href = `viber://chat?number=%2B${myPhone}`;
            }
        }, 1000);
    }).catch(() => {
        // Якщо копіювання не спрацювало (наприклад, старий браузер)
        if (platform === 'telegram') window.open(`https://t.me/${tgUsername}`, '_blank');
        else if (platform === 'viber') window.location.href = `viber://chat?number=%2B${myPhone}`;
    });
};
// --- ЛОГІКА ВІДКРИТТЯ ВІДГУКІВ (LIGHTBOX) ---
document.addEventListener('DOMContentLoaded', () => {
    const marqueeTrack = document.querySelector('.marquee-track');
    const lightbox = document.getElementById('review-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeBtn = document.getElementById('close-review');

    // Перевіряємо, чи є ці елементи на сторінці (щоб не було помилок)
    if (!marqueeTrack || !lightbox || !lightboxImg || !closeBtn) return;

    // СЛУХАЧ КЛІКІВ: Натискання на відгук
    const reviewCards = marqueeTrack.querySelectorAll('.review-card img');
    reviewCards.forEach(img => {
        img.addEventListener('click', (e) => {
            e.stopPropagation(); // Запобігаємо конфліктам з іншими кліками
            
            // 1. Беремо посилання на картинку, на яку натиснули
            const clickedImgSrc = e.target.src;
            
            // 2. Підставляємо її у велике вікно
            lightboxImg.src = clickedImgSrc;
            
            // 3. Відкриваємо Lightbox
            lightbox.classList.add('active');
            
            // 4. Забороняємо скрол сайту на фоні (щоб не гортався, коли читаємо)
            document.body.style.overflow = 'hidden';
            
            // 5. Зупиняємо анімацію біжучої стрічки (через JS, бо CSS :hover при кліку збивається)
            marqueeTrack.style.animationPlayState = 'paused';
        });
    });

    // СЛУХАЧ ЗАКРИТТЯ: Натискання на хрестик АБО на темний фон
    const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.style.overflow = ''; // Повертаємо скрол сайту
        
        // Відновлюємо рух стрічки (через 400мс, щоб анімація закриття вікна закінчилась)
        setTimeout(() => {
            marqueeTrack.style.animationPlayState = 'running';
        }, 400);
    };

    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', closeLightbox); // Клік в будь-яке місце фону теж закриває
});
//// --- ЛОГІКА ВІДЕО-КАРУСЕЛІ (Зі звуком по кліку) ---
document.addEventListener('DOMContentLoaded', () => {
    const videoTrack = document.getElementById('video-track');
    const btnPrev = document.getElementById('video-prev');
    const btnNext = document.getElementById('video-next');

    if (videoTrack && btnPrev && btnNext) {
        const getScrollAmount = () => {
            const slide = videoTrack.querySelector('.video-slide');
            return slide ? slide.offsetWidth + 20 : 300; 
        };

        btnPrev.addEventListener('click', () => {
            videoTrack.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
        });

        btnNext.addEventListener('click', () => {
            videoTrack.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
        });

        // --- ЛОГІКА ЗВУКУ (TIKTOK СТИЛЬ) ---
        // --- ЛОГІКА ЗВУКУ ТА ЗБІЛЬШЕННЯ ВІДЕО (TIKTOK СТИЛЬ) ---
        const allVideos = videoTrack.querySelectorAll('video');
        
        allVideos.forEach(video => {
            const slideContainer = video.closest('.video-slide'); // Знаходимо рамку відео

            video.addEventListener('click', () => {
                if (video.muted) {
                    // Спочатку вимикаємо звук і повертаємо розмір всім ІНШИМ відео
                    allVideos.forEach(v => {
                        v.muted = true;
                        if(v.closest('.video-slide')) {
                            v.closest('.video-slide').classList.remove('is-playing');
                        }
                    });
                    
                    // Вмикаємо звук на поточному відео і збільшуємо його рамку
                    video.muted = false;
                    if(slideContainer) slideContainer.classList.add('is-playing');
                    
                } else {
                    // Якщо звук вже грає — вимикаємо і повертаємо стандартний розмір
                    video.muted = true;
                    if(slideContainer) slideContainer.classList.remove('is-playing');
                }
            });
        });
    }
});
// --- ЛОГІКА ЗАСТАВКИ (ЕКРАН-ЗАВІСА) ---
// --- ЛОГІКА ЗАСТАВКИ (ЕКРАН-ЗАВІСА З ПАМ'ЯТТЮ) ---
document.addEventListener('DOMContentLoaded', () => {
    const introGate = document.getElementById('intro-gate');
    const enterBtn = document.getElementById('enter-site-btn');

    if (introGate && enterBtn) {
        
        // ПЕРЕВІРКА: Чи користувач вже бачив заставку?
        // Якщо він вже натискав кнопку, ми просто миттєво видаляємо заставку і показуємо сайт
        if (sessionStorage.getItem('introSeen') === 'true') {
            introGate.remove();
            document.body.style.overflow = '';
            return; // Зупиняємо подальше виконання коду
        }

        // Якщо користувач тут вперше за сесію - показуємо заставку
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 0); 

        enterBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            // ЗАПАМ'ЯТОВУЄМО, що клієнт вже пройшов заставку
            sessionStorage.setItem('introSeen', 'true');
            
            // Запускаємо анімацію підняття завіси
            introGate.classList.add('hidden-gate');
            document.body.style.overflow = ''; 
            
            // Повністю прибираємо заставку з пам'яті телефону через 1.2с
            setTimeout(() => {
                introGate.remove();
            }, 1200);
        });
    }
});
// --- ДИНАМІЧНИЙ ЗАГОЛОВОК ТА ХОВАННЯ ВІДЕО ПРИ ФІЛЬТРАЦІЇ ---
document.addEventListener('DOMContentLoaded', () => {
    // Знаходимо всі посилання категорій у меню
    const catLinks = document.querySelectorAll('.cat-link');
    const catalogTitle = document.getElementById('catalog-title');
    const videoSection = document.getElementById('video-section');

    catLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const category = link.getAttribute('data-category');
            
            // 1. ЗМІНЮЄМО ЗАГОЛОВОК
            if (catalogTitle) {
                if (category === 'all') {
                    catalogTitle.textContent = 'Усі товари';
                } else {
                    // Беремо красиву назву прямо з кнопки меню (очищаємо від зайвих пробілів та емодзі ведмедика)
                    catalogTitle.textContent = link.textContent.replace('🧸', '').trim();
                }
            }

            // 2. ХОВАЄМО АБО ПОКАЗУЄМО ВІДЕО
            if (videoSection) {
                if (category === 'all') {
                    // Якщо вибрали "Усі товари" - повертаємо відео
                    videoSection.style.display = 'block'; 
                } else {
                    // Якщо вибрали конкретну категорію - повністю ховаємо відео для швидкодії
                    videoSection.style.display = 'none'; 
                }
            }
        });
    });
});

// --- 🚀 РОЗУМНІ ВІДЕО (ОПТИМІЗАЦІЯ ПАМ'ЯТІ ТЕЛЕФОНУ) ---
document.addEventListener('DOMContentLoaded', () => {
    const videos = document.querySelectorAll('.video-slide video');
    
    // Перевіряємо, чи підтримує браузер цю функцію (всі сучасні підтримують)
    if ('IntersectionObserver' in window) {
        const videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Відео з'явилося на екрані (хоча б на 30%) - запускаємо
                    entry.target.play().catch(err => console.log('Автоплей заблоковано', err));
                } else {
                    // Відео пішло з екрану - ставимо на паузу, щоб не лагав сайт
                    entry.target.pause();
                }
            });
        }, { threshold: 0.3 }); // 0.3 означає, що видно 30% відео

        videos.forEach(video => {
            // Зупиняємо відео при старті (вони самі запустяться, коли до них доскролять)
            video.pause(); 
            videoObserver.observe(video);
        });
    }
});
// --- 🚚 ЛОГІКА ДИНАМІЧНИХ ПІДКАЗОК ДОСТАВКИ В КОШИКУ (ДЛЯ РАДІОКНОПОК) ---
document.addEventListener('DOMContentLoaded', () => {
    // Знаходимо всі кружечки (радіокнопки) вибору доставки
    const deliveryRadios = document.querySelectorAll('input[name="delivery-service"]'); 
    
    // Знаходимо наші красиві блоки підказок
    const prepayNotice = document.getElementById('prepayment-notice');
    const ukrposhtaNotice = document.getElementById('ukrposhta-notice');
    
    // Знаходимо блок вибору Відділення/Поштомат (тільки для НП)
    const npTypeBlock = document.getElementById('np-type-block');

    if (deliveryRadios.length > 0 && prepayNotice && ukrposhtaNotice) {
        
        // Функція, яка перемикає блоки
        const updateDeliveryNotice = () => {
            // Знаходимо, яка саме кнопка зараз вибрана
            const selectedMethod = document.querySelector('input[name="delivery-service"]:checked').value;
            
            if (selectedMethod === 'Укрпошта') {
                // Показуємо зелений блок Укрпошти
                prepayNotice.style.display = 'none';
                ukrposhtaNotice.style.display = 'flex';
                
                // Ховаємо вибір "Поштомат", залишаємо просто поле для вводу номера відділення
                if (npTypeBlock) npTypeBlock.style.display = 'none'; 
                
            } else {
                // Показуємо рожевий блок Нової Пошти
                ukrposhtaNotice.style.display = 'none';
                prepayNotice.style.display = 'flex';
                
                // Повертаємо вибір Відділення/Поштомат
                if (npTypeBlock) npTypeBlock.style.display = 'flex'; 
            }
        };

        // Слухаємо кожне натискання на радіокнопки
        deliveryRadios.forEach(radio => {
            radio.addEventListener('change', updateDeliveryNotice);
        });
        
        // Запускаємо один раз при відкритті кошика, щоб налаштувати правильний вигляд
        updateDeliveryNotice(); 
    }

});

// --- 🪄 ЛОГІКА ДЛЯ ВІКНА "ЯК ЗАМОВИТИ" (ВИПРАВЛЕНА) ---
// Додаємо window. щоб HTML-кнопки гарантовано бачили ці команди
window.openHowToOrderModal = function() {
    const modal = document.getElementById('how-to-order-modal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; 
    }
};

window.closeHowToOrderModal = function() {
    const modal = document.getElementById('how-to-order-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = ''; 
    }
};

// Це залишаємо як було
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('how-to-order-btn');
    if (btn) btn.addEventListener('click', window.openHowToOrderModal);
    
    const overlay = document.getElementById('how-to-order-modal');
    if(overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.closeHowToOrderModal();
            }
        });
    }
});

// --- 💾 РОЗУМНЕ АВТОЗБЕРЕЖЕННЯ (БЕЗ ТЕМНИХ ЕКРАНІВ) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. ВІДНОВЛЕННЯ ПІСЛЯ ОНОВЛЕННЯ (Через імітацію кліку)
    // Даємо затримку 0.8 сек, щоб товари з бази 100% встигли завантажитися
    setTimeout(() => {
        const activeWindow = sessionStorage.getItem('smartActiveWindow');
        
        if (activeWindow === 'cart') {
            // Програмно "натискаємо" на кнопку кошика
            const cartBtn = document.getElementById('main-cart-btn');
            if (cartBtn) cartBtn.click();
        } 
        else if (activeWindow === 'how-to-order') {
            // Відкриваємо інструкцію
            if (typeof window.openHowToOrderModal === 'function') {
                window.openHowToOrderModal();
            }
        }
    }, 800); 

    // 2. ЗАПАМ'ЯТОВУВАННЯ СТАНУ (Спостерігач)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
                const target = mutation.target;
                
                if (target.classList.contains('show')) {
                    // Якщо відкрили кошик
                    if (target.id === 'cart-modal' || target.id === 'cart-overlay') {
                        sessionStorage.setItem('smartActiveWindow', 'cart');
                    } 
                    // Якщо відкрили інструкцію
                    else if (target.id === 'how-to-order-modal') {
                        sessionStorage.setItem('smartActiveWindow', 'how-to-order');
                    }
                } else {
                    // Якщо вікна закрилися - очищаємо пам'ять браузера
                    const currentMemory = sessionStorage.getItem('smartActiveWindow');
                    if (
                        (currentMemory === 'cart' && (target.id === 'cart-modal' || target.id === 'cart-overlay')) ||
                        (currentMemory === 'how-to-order' && target.id === 'how-to-order-modal')
                    ) {
                        sessionStorage.removeItem('smartActiveWindow');
                    }
                }
            }
        });
    });

    // Підключаємо спостерігач до вікон кошика та інструкції
    ['cart-modal', 'cart-overlay', 'how-to-order-modal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
});

// --- 🍞 ЛОГІКА ГАРНИХ СПОВІЩЕНЬ (TOASTS) ---
window.showToast = function(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;

    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'info') icon = '💡';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Плавна поява
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Видаляємо через певний час (довше для інструкцій, швидше для помилок)
    const duration = type === 'info' ? 5500 : 3500;
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500); // Чекаємо завершення анімації
    }, duration);
};

// --- ФУНКЦІЯ ПЕРЕМИКАННЯ ФОТО В ГАЛЕРЕЇ ---
window.changeMainImage = function(src, element) {
    // Змінюємо головне зображення
    document.getElementById('modal-img').src = src;
    
    // Переносимо червону рамочку на активну мініатюру
    document.querySelectorAll('.modal-thumb').forEach(th => th.classList.remove('active'));
    if (element) element.classList.add('active');
};