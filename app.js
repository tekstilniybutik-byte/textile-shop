import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://hsrfoepbcoyouvtobjhx.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzcmZvZXBiY295b3V2dG9iamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTYwMzUsImV4cCI6MjA5NDIzMjAzNX0.10GQQM59H5cm_km4Ru4d5Dz0JRXw4Zz3LU1yaNsoVkA'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const productsGrid = document.getElementById('products-grid');
let allProducts = []; // Тут будемо зберігати завантажені товари

const categoriesDict = { 'postil': 'Постільна білизна', 'rushnyky': 'Рушники', 'pledy': 'Пледи', 'dekor': 'Декор' };

// Завантаження з бази
async function loadProducts() {
    // 1. Завантажуємо дані з бази
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false });

    // Перевірка помилок завантаження
    if (error) {
        productsGrid.innerHTML = `<p style="color:red; text-align:center;">Помилка: ${error.message}</p>`;
        return;
    }
    
    if (!data || data.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center;">Товари скоро з\'являться!</p>';
        return;
    }

    // 2. Зберігаємо товари у глобальний масив та відмальовуємо їх
    allProducts = data; 
    renderProducts('all'); 

    // 3. ПЕРЕВІРКА URL НА АРТИКУЛ (?art=...)
    const urlParams = new URLSearchParams(window.location.search);
    const artParam = urlParams.get('art'); 

    if (artParam) {
        // Чистимо параметр від решітки та пробілів
        const cleanArt = artParam.replace('#', '').trim();
        
        // Шукаємо товар (перевіряємо і поле sku, і поле art)
        const product = allProducts.find(p => {
            const productSku = p.sku ? String(p.sku).replace('#', '').trim() : '';
            const productArt = p.art ? String(p.art).replace('#', '').trim() : '';
            return productSku === cleanArt || productArt === cleanArt;
        });
        
        if (product) {
            // Викликаємо функцію відкриття модалки, яку ми зробили раніше
            openProductModal(product.id);
        } else {
            console.log(`Товар з артикулом ${cleanArt} не знайдено.`);
        }
    }
}

// Функція малювання карток (з фільтрацією)
function renderProducts(categoryFilter) {
    productsGrid.innerHTML = ''; 
    let filteredData = allProducts;

    // ФІЛЬТРАЦІЯ
    if (categoryFilter === 'kids') {
        // Шукаємо слово "дитяч" у назві (ігноруючи регістр)
        filteredData = allProducts.filter(p => p.title.toLowerCase().includes('дитяч'));
    } else if (categoryFilter !== 'all') {
        // Фільтруємо по точній категорії з бази
        filteredData = allProducts.filter(p => p.category === categoryFilter);
    }

    if (filteredData.length === 0) {
        productsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">У цій категорії поки немає товарів.</p>';
        return;
    }

    filteredData.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        let priceText = `${product.price} ₴`;
        if (product.variations && product.variations.length > 1) {
            priceText = `від ${product.price} ₴`;
        }

        // Якщо це дитячий товар, примусово пишемо "Дитяче", інакше беремо з бази
        const isKids = product.title.toLowerCase().includes('дитяч');
        const catName = isKids ? 'Дитяча колекція' : (categoriesDict[product.category] || product.category);

        card.innerHTML = `
            <div class="product-image-wrap">
                <img src="${product.image_url}" alt="${product.title}">
            </div>
            <div class="product-info">
                <span class="product-category">${catName}</span>
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">${priceText}</div>
                <button class="buy-btn" data-id="${product.id}">Переглянути</button>
            </div>
        `;

        card.addEventListener('click', () => openProductModal(product.id));
        productsGrid.appendChild(card);
    });
}

// --- ЛОГІКА БОКОВОГО МЕНЮ ---
const burgerBtn = document.getElementById('burger-btn');
const sidebar = document.getElementById('sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const overlay = document.getElementById('sidebar-overlay');
const catLinks = document.querySelectorAll('.cat-link');

function toggleMenu() {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    if(sidebar.classList.contains('open')) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
}

burgerBtn.addEventListener('click', toggleMenu);
closeSidebarBtn.addEventListener('click', toggleMenu);
overlay.addEventListener('click', toggleMenu);

// Кліки по категоріях у меню
catLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Перемикаємо активний клас
        catLinks.forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');

        // Отримуємо категорію (all, postil, rushnyky, kids) і фільтруємо
        const cat = e.target.getAttribute('data-category');
        renderProducts(cat);
        
        // Закриваємо меню після вибору (зручно для мобільних)
        toggleMenu(); 

        // Скролимо до товарів
        document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    });
});

// --- ЛОГІКА МОДАЛЬНОГО ВІКНА ---
const modal = document.getElementById('product-modal');
const closeModalBtn = document.querySelector('.close-modal');

function openProductModal(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;
   const sku = (product.sku || product.art || "").toString().replace('#', '').trim();
    
    // Створюємо новий об'єкт URL на основі поточного (це збереже /site/index.html)
    const url = new URL(window.location.href);
    url.searchParams.set('art', sku); // Додаємо ?art=POS-34484
    
    // Оновлюємо рядок без перезавантаження
    window.history.pushState({}, '', url);
    // Заповнюємо базову інфу
    document.getElementById('m-img').src = product.image_url;
    document.getElementById('m-category').textContent = categoriesDict[product.category] || product.category;
    document.getElementById('m-title').textContent = product.title;
    document.getElementById('m-sku').textContent = product.sku ? `Артикул: #${product.sku}` : '';
    document.getElementById('m-material').innerHTML = product.material ? `<strong>Матеріал:</strong> ${product.material}` : '';
    document.getElementById('m-desc').textContent = product.description || 'Опис відсутній.';

    const varsContainer = document.getElementById('m-variations');
    const priceDisplay = document.getElementById('m-price');
    const compsDisplay = document.getElementById('m-components');
    
    varsContainer.innerHTML = '';

    // Функція, яка оновлює ціну та комплектацію при зміні варіації
    const selectVariation = (v) => {
        // Ціна
        const currentPrice = v.sale_price || v.price;
        const oldPriceHtml = v.sale_price ? `<del style="color:#A0A0A0; font-size:18px; margin-right:10px;">${v.price} ₴</del>` : '';
        priceDisplay.innerHTML = `${oldPriceHtml}${currentPrice} ₴`;

        // Комплектація
        compsDisplay.innerHTML = '';
        if(v.components && v.components.length > 0) {
            v.components.forEach(c => {
                const sizeStr = c.size ? `<span style="font-size:12px; color:#A0A0A0;"> (${c.size})</span>` : '';
                compsDisplay.innerHTML += `<li><span>${c.name}${sizeStr}</span> <strong>${c.qty} шт</strong></li>`;
            });
            document.querySelector('.m-components-wrap').style.display = 'block';
        } else {
            document.querySelector('.m-components-wrap').style.display = 'none';
        }
    };

    // Рендеримо кнопки варіацій (розмірів)
    if (product.variations && product.variations.length > 0) {
        if (product.variations.length === 1 && !product.variations[0].name) {
            // Якщо це "Один розмір" (кнопки не потрібні)
            selectVariation(product.variations[0]);
        } else {
            // Якщо є розміри (Євро, Полуторний і т.д.)
            product.variations.forEach((v, index) => {
                const btn = document.createElement('button');
                btn.className = `var-btn ${index === 0 ? 'active' : ''}`;
                btn.textContent = v.name || 'Стандарт';
                
                btn.onclick = () => {
                    document.querySelectorAll('.var-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    selectVariation(v);
                };
                varsContainer.appendChild(btn);
            });
            // Вибираємо першу варіацію по замовчуванню
            selectVariation(product.variations[0]);
        }
    }

    // Показуємо модалку
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Ховаємо скрол сторінки
}

// Закриття модалки по кліку на хрестик
closeModalBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';

    // ПРИБИРАЄМО АРТИКУЛ З ПОСИЛАННЯ
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.pushState({ path: cleanUrl }, '', cleanUrl);
});

// Також варто додати це при кліку на фон (overlay)
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.pushState({ path: cleanUrl }, '', cleanUrl);
    }
});

// Закриття модалки по кліку на темний фон навколо
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto'; // Повертаємо скрол
}

// --- ЛОГІКА КОШИКА ТА ВІДПРАВКА ЗАМОВЛЕННЯ ---
const cartOverlay = document.getElementById('cart-overlay');
const cartPanel = document.getElementById('cart-panel');
const closeCartBtn = document.getElementById('close-cart');
const cartBtn = document.querySelector('.cart-btn'); 

// Безпечне відкриття кошика (перевіряємо, чи є він на сторінці)
if (cartBtn && cartOverlay && cartPanel) {
    cartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cartOverlay.classList.add('show');
        cartPanel.classList.add('open');
    });
}

function closeCart() {
    if(cartOverlay) cartOverlay.classList.remove('show');
    if(cartPanel) cartPanel.classList.remove('open');
}
if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

// --- РЕАЛЬНИЙ КОШИК ---
let myCart = []; 

function renderCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const totalSumEl = document.getElementById('cart-total-sum');
    const badge = document.querySelector('.cart-count'); // Виправлено на твій клас
    
    if (!cartItemsDiv || !totalSumEl) return;

    if (myCart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align:center; color: #7f8fa6; margin-top: 20px;">Кошик порожній 😔</p>';
        totalSumEl.innerText = '0 ₴';
        if(badge) badge.innerText = '0';
        return;
    }

    let html = '';
    let total = 0;

    myCart.forEach((item, index) => {
        total += item.price;
        html += `
            <div class="cart-item">
                <img src="${item.img}" alt="Товар" class="cart-item-img">
                <div class="cart-item-info">
                    <h4>${item.title}</h4>
                    <p>Арт: ${item.art}</p>
                    <p>Варіація: <strong>${item.variation}</strong></p>
                    <div class="price">${item.price} ₴</div>
                </div>
                <button class="remove-item" onclick="window.removeFromCart(${index})">✖</button>
            </div>
        `;
    });

    cartItemsDiv.innerHTML = html;
    totalSumEl.innerText = total + ' ₴';
    if(badge) badge.innerText = myCart.length;
}

// Робимо функцію глобальною, щоб вона працювала в module
window.removeFromCart = function(index) {
    myCart.splice(index, 1);
    renderCart();
}

renderCart();

// --- ВІДПРАВКА В МЕСЕНДЖЕР ---
window.sendOrder = function(platform) {
    const name = document.getElementById('client-name').value.trim();
    const phone = document.getElementById('client-phone').value.trim();
    const city = document.getElementById('client-city').value.trim();
    const branch = document.getElementById('client-branch').value.trim();

    if (!name || !phone) {
        alert("Будь ласка, введіть ПІБ та номер телефону!");
        return;
    }

    if (myCart.length === 0) {
        alert("Кошик порожній!");
        return;
    }

    // Твій номер телефону у форматі 380... (без плюса)
    const myPhone = "380984165936"; // ЗАМІНИ НА СВІЙ НОМЕР
    const tgUsername = "AllaVerba1"; // ЗАМІНИ НА СВІЙ ТЕЛЕГРАМ (без @)

    // Формуємо список товарів
    let itemsText = "";
    let totalSum = 0;
    myCart.forEach((item, index) => {
        itemsText += `${index + 1}. ${item.title} (${item.variation}) — ${item.price} ₴\n`;
        itemsText += `   Артикул: ${item.art}\n`;
        totalSum += parseInt(item.price);
    });

    // Формуємо текст повідомлення
    let message = `🛍️ НОВЕ ЗАМОВЛЕННЯ\n\n`;
    message += `👤 Покупець: ${name}\n`;
    message += `📞 Тел: ${phone}\n`;
    message += `📍 Доставка: ${city}, №${branch}\n\n`;
    message += `📦 Товари:\n${itemsText}\n`;
    message += `💰 Разом до оплати: ${totalSum} ₴\n\n`;
    
    // Додаємо посилання на сайт, щоб ви бачили, звідки прийшли
    message += `🔗 Посилання: ${window.location.href}`;

    const encodedMessage = encodeURIComponent(message);
    
    // ВСТАВ СВОЇ ДАНІ
    const telegramManagerNick = "AllaVerba1"; 
    const viberManagerPhone = "380984165936"; 

    if (messenger === 'telegram') {
        window.open(`https://t.me/${telegramManagerNick}?text=${encodedText}`, '_blank');
    } else if (messenger === 'viber') {
        window.open(`viber://chat?number=%2B${viberManagerPhone}&draft=${encodedText}`, '_blank');
    }
}

// --- ДОДАВАННЯ ТОВАРУ В КОШИК ---
const modalAddToCartBtn = document.getElementById('modal-add-to-cart');

if (modalAddToCartBtn) {
    modalAddToCartBtn.addEventListener('click', () => {
        const title = document.getElementById('m-title').innerText;
        const priceText = document.getElementById('m-price').innerText;
        const price = parseInt(priceText.replace(/\D/g, ''));
        const img = document.getElementById('m-img').src;
        
        let art = document.getElementById('m-sku').innerText;
        art = art.replace('Артикул:', '').trim(); 
        
        const activeVariationBtn = document.querySelector('#m-variations .active');
        const variation = activeVariationBtn ? activeVariationBtn.innerText : "Стандартна";

        const newItem = {
            title: title,
            variation: variation,
            price: price,
            art: art || "Без артикулу",
            img: img
        };

        myCart.push(newItem);
        renderCart();
        // --- Додаємо АНІМАЦІЮ СТРИБКА ---
        const cartIconBtn = document.querySelector('.cart-btn');
        if (cartIconBtn) {
            cartIconBtn.classList.add('cart-bounce');
            // Забираємо клас через 400 мілісекунд, щоб анімація могла спрацювати наступного разу
            setTimeout(() => {
                cartIconBtn.classList.remove('cart-bounce');
            }, 400);
        }
        
        // Закриваємо модалку товару
        const productModal = document.getElementById('product-modal');
        if (productModal) {
            productModal.classList.remove('show');
            document.body.style.overflow = 'auto'; 
        }
        
        // Відкриваємо бокову панель кошика
        if (cartOverlay && cartPanel) {
            cartOverlay.classList.add('show');
            cartPanel.classList.add('open');
        }
    });
}

// --- ЛОГІКА ВІДКРИТТЯ МОДАЛКИ ЗА АРТИКУЛОМ З URL ---
async function checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const art = urlParams.get('art');

    if (art) {
        // Очищаємо артикул від решітки, якщо користувач її ввів у посилання
        const cleanArt = art.replace('#', '').trim();
        
        // Шукаємо товар у масиві (перевіряємо і sku, і art для надійності)
        const product = allProducts.find(p => 
            (p.sku && p.sku.replace('#', '') === cleanArt) || 
            (p.art && p.art.replace('#', '') === cleanArt)
        );
        
        if (product) {
            // Викликаємо твою функцію за ID
            openProductModal(product.id);
        } else {
            console.log("Товар з артикулом " + cleanArt + " не знайдено в базі.");
        }
    }
}

// Запускаємо перевірку після завантаження товарів
window.addEventListener('load', checkUrlParams);
// Запуск

loadProducts();