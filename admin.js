import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://hsrfoepbcoyouvtobjhx.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzcmZvZXBiY295b3V2dG9iamh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTYwMzUsImV4cCI6MjA5NDIzMjAzNX0.10GQQM59H5cm_km4Ru4d5Dz0JRXw4Zz3LU1yaNsoVkA'; 

const supabase = createClient(supabaseUrl, supabaseKey);

// Навігація
const navBtns = document.querySelectorAll('.nav-btn');
const sections = document.querySelectorAll('.section');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        document.getElementById(targetId).classList.add('active');
        if(targetId === 'list-section') fetchProducts();
    });
});

const form = document.getElementById('add-product-form');
const statusMessage = document.getElementById('status-message');
const productsList = document.getElementById('products-list');
const variationsContainer = document.getElementById('variations-container');
const addVarBtn = document.getElementById('add-var-btn');
const typeRadios = document.getElementsByName('product_type');

let editingProductId = null;
let editingProductImageUrl = null;
let isVariable = false;

// Логіка перемикача типу
typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        isVariable = e.target.value === 'variable';
        addVarBtn.style.display = isVariable ? 'block' : 'none';
        variationsContainer.innerHTML = '';
        createVariationBlock(); 
    });
});

// СТВОРЕННЯ РЯДКА КОМПОНЕНТА
function createComponentRow(container, name = '', size = '', qty = '1') {
    const row = document.createElement('div');
    row.className = 'comp-row';
    row.innerHTML = `
        <input type="text" class="comp-name" placeholder="Деталь (Простирадло)" value="${name}" required>
        <input type="text" class="comp-size" placeholder="Розмір (200x220)" value="${size}">
        <input type="number" class="comp-qty" placeholder="Шт" value="${qty}" required min="1">
        <button type="button" class="btn-icon comp-del">🗑️</button>
    `;
    row.querySelector('.comp-del').addEventListener('click', () => row.remove());
    container.appendChild(row);
}

// СТВОРЕННЯ БЛОКУ ВАРІАЦІЇ
function createVariationBlock(vData = {}) {
    const varBlock = document.createElement('div');
    varBlock.className = 'var-block';
    
    const nameDisplay = isVariable ? 'block' : 'none';
    const deleteBtnDisplay = isVariable ? 'block' : 'none';
    
    varBlock.innerHTML = `
        <div class="var-header">
            <input type="text" class="var-name" placeholder="Назва варіації (напр. Євро)" value="${vData.name || ''}" style="display: ${nameDisplay};" ${isVariable ? 'required' : ''}>
            <input type="number" class="var-price" placeholder="Ціна (₴)" value="${vData.price || ''}" required>
            <input type="number" class="var-sale" placeholder="Акція (₴)" value="${vData.sale_price || ''}">
            <input type="number" class="var-bulk" placeholder="Від 2 шт (₴)" value="${vData.bulk_price || ''}">
            <button type="button" class="btn-icon remove-var-btn delete" style="display: ${deleteBtnDisplay};">🗑️</button>
        </div>
        <div class="comp-wrapper">
            <h4>Комплектація (що входить у набір):</h4>
            <div class="comp-list"></div>
            <button type="button" class="action-btn secondary-btn add-comp-btn" style="width: auto;">+ Додати деталь</button>
        </div>
    `;

    varBlock.querySelector('.remove-var-btn').addEventListener('click', () => varBlock.remove());
    const compListContainer = varBlock.querySelector('.comp-list');
    
    varBlock.querySelector('.add-comp-btn').addEventListener('click', () => {
        createComponentRow(compListContainer);
    });

    if (vData.components && vData.components.length > 0) {
        vData.components.forEach(c => createComponentRow(compListContainer, c.name, c.size, c.qty));
    } else {
        createComponentRow(compListContainer);
    }

    variationsContainer.appendChild(varBlock);
}

// Ініціалізація
createVariationBlock();
addVarBtn.addEventListener('click', () => createVariationBlock());

// ВІДОБРАЖЕННЯ ТОВАРІВ
async function fetchProducts() {
    productsList.innerHTML = '<p style="text-align:center; color:gray;">Завантаження...</p>';
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });

    if (error) return productsList.innerHTML = `<p style="color:red;">Помилка: ${error.message}</p>`;
    if (data.length === 0) return productsList.innerHTML = '<p style="text-align:center;">Товарів поки немає 🛍️</p>';

    productsList.innerHTML = '';
    data.forEach(product => {
        const item = document.createElement('div');
        item.className = 'product-item';

        let varsHTML = '';
        if (product.variations) {
            product.variations.forEach(v => {
                const varName = v.name ? `<strong>${v.name}</strong>:` : '<strong>Ціна</strong>:';
                const mainPrice = v.sale_price ? `<del style="color:#aaa;">${v.price}</del> <span style="color:#FF477E; font-weight: bold;">${v.sale_price} ₴</span>` : `<strong style="color:#FF477E;">${v.price} ₴</strong>`;
                const bulkPrice = v.bulk_price ? ` <span style="color:#27ae60; font-size:12px;">(Від 2 шт: ${v.bulk_price} ₴)</span>` : '';
                
                let compsListHTML = '';
                if(v.components && v.components.length > 0) {
                    compsListHTML = '<ul class="comp-list-display">';
                    v.components.forEach(c => {
                        const sizeStr = c.size ? ` (${c.size})` : '';
                        compsListHTML += `<li>${c.name}${sizeStr} — ${c.qty} шт.</li>`;
                    });
                    compsListHTML += '</ul>';
                }

                varsHTML += `<div class="var-chip">${varName} ${mainPrice}${bulkPrice} ${compsListHTML}</div>`;
            });
        }

        const skuText = product.sku ? `<span style="color:#A0A0A0; font-size:14px; font-weight:normal; margin-left: 5px;">#${product.sku}</span>` : '';

        item.innerHTML = `
            <img src="${product.image_url}" class="product-img" alt="Фото">
            <div class="product-info">
                <h3 style="margin-bottom: 5px; font-size: 18px;">${product.title} ${skuText} ${product.in_stock ? '✅' : '❌'}</h3>
                <p style="color: #A0A0A0; font-size: 13px; margin-bottom: 5px;">Категорія: ${product.category}</p>
                ${product.material ? `<p style="font-size: 13px; margin-bottom: 5px;"><strong>Матеріал:</strong> ${product.material}</p>` : ''}
                <div style="margin-top: 10px;">${varsHTML}</div>
            </div>
            <div class="product-actions" style="display: flex; gap: 10px;">
                <button class="btn-icon edit" data-product='${JSON.stringify(product).replace(/'/g, "&#39;")}'>✏️</button>
                <button class="btn-icon delete" data-id="${product.id}" data-image="${product.image_url}">🗑️</button>
            </div>
        `;

        item.querySelector('.delete').addEventListener('click', async (e) => {
            if(confirm('Видалити цей товар назавжди?')) {
                const id = e.target.closest('.delete').dataset.id;
                const imgUrl = e.target.closest('.delete').dataset.image;
                const fileName = imgUrl.substring(imgUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('product-images').remove([fileName]);
                await supabase.from('products').delete().eq('id', id);
                fetchProducts(); 
            }
        });

        item.querySelector('.edit').addEventListener('click', (e) => {
            const productData = JSON.parse(e.target.closest('.edit').dataset.product);
            startEditing(productData);
        });

        productsList.appendChild(item);
    });
}

// ПІДГОТОВКА ДО РЕДАГУВАННЯ
function startEditing(product) {
    editingProductId = product.id;
    editingProductImageUrl = product.image_url;

    navBtns[0].click(); 
    document.getElementById('form-title').textContent = 'Редагування товару';
    document.getElementById('submit-btn').textContent = 'Зберегти зміни';
    document.getElementById('cancel-edit-btn').style.display = 'block';

    document.getElementById('title').value = product.title;
    document.getElementById('category').value = product.category;
    document.getElementById('sku').value = product.sku || ''; // Заповнюємо артикул
    document.getElementById('material').value = product.material || '';
    document.getElementById('description').value = product.description || '';
    document.getElementById('in-stock').checked = product.in_stock;

    variationsContainer.innerHTML = '';
    
    isVariable = product.variations && product.variations.length > 1;
    typeRadios[isVariable ? 1 : 0].checked = true;
    addVarBtn.style.display = isVariable ? 'block' : 'none';

    if (product.variations && product.variations.length > 0) {
        product.variations.forEach(v => createVariationBlock(v));
    } else {
        createVariationBlock();
    }
}

// СКАСУВАННЯ РЕДАГУВАННЯ
document.getElementById('cancel-edit-btn').addEventListener('click', () => {
    editingProductId = null;
    editingProductImageUrl = null;
    form.reset();
    typeRadios[0].checked = true;
    isVariable = false;
    addVarBtn.style.display = 'none';
    
    variationsContainer.innerHTML = '';
    createVariationBlock();
    
    document.getElementById('form-title').textContent = 'Новий товар';
    document.getElementById('submit-btn').textContent = 'Зберегти товар';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    statusMessage.textContent = '';
});

// ЗБЕРЕЖЕННЯ / ДОДАВАННЯ ТОВАРУ
form.addEventListener('submit', async (event) => {
    event.preventDefault(); 
    statusMessage.textContent = 'Збереження... ⏳';
    statusMessage.style.color = '#636E72';

    const title = document.getElementById('title').value;
    const category = document.getElementById('category').value;
    let sku = document.getElementById('sku').value.trim();
    const material = document.getElementById('material').value;
    const description = document.getElementById('description').value;
    const in_stock = document.getElementById('in-stock').checked;
    const file = document.getElementById('image-file').files[0];

    // АВТОГЕНЕРАЦІЯ АРТИКУЛУ
    if (!sku) {
        const prefix = category.substring(0, 3).toUpperCase(); // Наприклад POS, RUS, PLE
        const randomNum = Math.floor(10000 + Math.random() * 90000); // Від 10000 до 99999
        sku = `${prefix}-${randomNum}`;
    }

    const variationsArray = [];
    let minBasePrice = Infinity;

    document.querySelectorAll('.var-block').forEach(block => {
        const vName = isVariable ? block.querySelector('.var-name').value.trim() : '';
        const vPrice = parseInt(block.querySelector('.var-price').value);
        const vSaleInput = block.querySelector('.var-sale').value;
        const vBulkInput = block.querySelector('.var-bulk').value;
        
        const vSalePrice = vSaleInput ? parseInt(vSaleInput) : null;
        const vBulkPrice = vBulkInput ? parseInt(vBulkInput) : null;

        const componentsArray = [];
        block.querySelectorAll('.comp-row').forEach(row => {
            const cName = row.querySelector('.comp-name').value.trim();
            const cSize = row.querySelector('.comp-size').value.trim();
            const cQty = parseInt(row.querySelector('.comp-qty').value);
            
            if (cName) {
                componentsArray.push({ name: cName, size: cSize, qty: cQty });
            }
        });

        if (!isNaN(vPrice)) {
            variationsArray.push({ 
                name: vName, 
                price: vPrice, 
                sale_price: vSalePrice,
                bulk_price: vBulkPrice,
                components: componentsArray 
            });
            const effectivePrice = vSalePrice || vPrice;
            if (effectivePrice < minBasePrice) minBasePrice = effectivePrice;
        }
    });

    if (variationsArray.length === 0) {
        return statusMessage.innerHTML = '<span style="color:red;">Додайте ціну товару!</span>';
    }

    if (!editingProductId && !file) {
        return statusMessage.innerHTML = '<span style="color:red;">Виберіть фото!</span>';
    }

    try {
        let finalImageUrl = editingProductImageUrl;

        if (file) {
            const fileName = `${Date.now()}.${file.name.split('.').pop()}`; 
            await supabase.storage.from('product-images').upload(fileName, file);
            finalImageUrl = supabase.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;

            if (editingProductId && editingProductImageUrl) {
                const oldFileName = editingProductImageUrl.substring(editingProductImageUrl.lastIndexOf('/') + 1);
                await supabase.storage.from('product-images').remove([oldFileName]);
            }
        }

        const productDataObj = {
            title: title,
            category: category,
            sku: sku, // Зберігаємо артикул у базу
            material: material,
            description: description,
            image_url: finalImageUrl,
            in_stock: in_stock,
            variations: variationsArray,
            price: minBasePrice !== Infinity ? minBasePrice : 0, 
            sale_price: null
        };

        if (editingProductId) {
            await supabase.from('products').update(productDataObj).eq('id', editingProductId);
        } else {
            await supabase.from('products').insert([productDataObj]);
        }

        statusMessage.innerHTML = '<span style="color:#27ae60;">Готово! 🎉</span>';
        setTimeout(() => { document.getElementById('cancel-edit-btn').click(); navBtns[1].click(); }, 1000);

    } catch (error) {
        statusMessage.innerHTML = `<span style="color:red;">Помилка: ${error.message}</span>`;
    }
});