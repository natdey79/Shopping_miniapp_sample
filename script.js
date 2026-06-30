// ============================================================
// 1. INITIALIZE TELEGRAM WEB APP
// ============================================================
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('user-greeting').textContent = 
        `Welcome, ${user.first_name}! 👋`;
}

// ============================================================
// 2. APP STATE
// ============================================================
let items = [];

function loadItems() {
    const saved = localStorage.getItem('shopping_items');
    if (saved) {
        items = JSON.parse(saved);
        renderItems();
    }
}

function saveItems() {
    localStorage.setItem('shopping_items', JSON.stringify(items));
}

// ============================================================
// 3. DOM ELEMENTS
// ============================================================
const itemNameInput = document.getElementById('item-name');
const itemQuantityInput = document.getElementById('item-quantity');
const itemCategorySelect = document.getElementById('item-category');
const addItemBtn = document.getElementById('add-item-btn');
const itemListEl = document.getElementById('item-list');
const totalItemsEl = document.getElementById('total-items');
const purchasedItemsEl = document.getElementById('purchased-items');
const remainingItemsEl = document.getElementById('remaining-items');
const clearPurchasedBtn = document.getElementById('clear-purchased-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

// ============================================================
// 4. BACKEND CONNECTION
// ============================================================
const BACKEND_URL = 'https://tg-win-mini-app-test.onrender.com/api/shopping';

function syncWithBackend() {
    fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            items: items,
            initData: tg.initData
        })
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('✅ Shopping list synced with backend:', data);
    })
    .catch(error => {
        console.error('❌ Error syncing shopping list:', error);
    });
}

function loadFromBackend() {
    fetch(`${BACKEND_URL}?initData=${encodeURIComponent(tg.initData)}`)
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.success && data.items && data.items.length > 0) {
            items = data.items;
            saveItems();
            renderItems();
            updateMainButton();
            console.log('✅ Shopping list loaded from backend');
        } else {
            loadItems();
        }
    })
    .catch(error => {
        console.error('❌ Error loading shopping list:', error);
        loadItems();
    });
}

// ============================================================
// 5. CORE FUNCTIONS
// ============================================================

function addItem() {
    const name = itemNameInput.value.trim();
    const quantity = parseInt(itemQuantityInput.value) || 1;
    const category = itemCategorySelect.value;
    
    if (!name) {
        tg.showPopup({
            title: 'Missing Info',
            message: 'Please enter an item name.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const item = {
        id: Date.now(),
        name: name,
        quantity: quantity,
        category: category,
        purchased: false,
        createdAt: new Date().toISOString()
    };
    
    items.push(item);
    saveItems();
    renderItems();
    syncWithBackend();
    
    itemNameInput.value = '';
    itemQuantityInput.value = '1';
    
    tg.HapticFeedback.notificationOccurred('success');
    tg.showPopup({
        title: '✅ Item Added!',
        message: `${quantity}x ${name} added to your shopping list.`,
        buttons: [{ type: 'ok' }]
    });
    
    updateMainButton();
}

function togglePurchased(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.purchased = !item.purchased;
        saveItems();
        renderItems();
        syncWithBackend();
        tg.HapticFeedback.impactOccurred('light');
        updateMainButton();
    }
}

function deleteItem(id) {
    const item = items.find(i => i.id === id);
    items = items.filter(i => i.id !== id);
    saveItems();
    renderItems();
    syncWithBackend();
    tg.HapticFeedback.impactOccurred('medium');
    updateMainButton();
}

function clearPurchased() {
    const purchased = items.filter(i => i.purchased);
    if (purchased.length === 0) {
        tg.showPopup({
            title: 'Nothing to Clear',
            message: 'No purchased items to remove.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    tg.showPopup({
        title: '🧹 Clear Purchased?',
        message: `Remove ${purchased.length} purchased item(s)?`,
        buttons: [
            { type: 'cancel' },
            { type: 'ok' }
        ]
    }, function(buttonIndex) {
        if (buttonIndex === 1) {
            items = items.filter(i => !i.purchased);
            saveItems();
            renderItems();
            syncWithBackend();
            tg.HapticFeedback.notificationOccurred('success');
            updateMainButton();
        }
    });
}

function clearAll() {
    if (items.length === 0) return;
    
    tg.showPopup({
        title: '⚠️ Clear All?',
        message: 'Delete all items from your shopping list?',
        buttons: [
            { type: 'cancel' },
            { type: 'ok' }
        ]
    }, function(buttonIndex) {
        if (buttonIndex === 1) {
            items = [];
            saveItems();
            renderItems();
            syncWithBackend();
            tg.HapticFeedback.notificationOccurred('warning');
            updateMainButton();
        }
    });
}

function renderItems() {
    if (items.length === 0) {
        itemListEl.innerHTML = `<p class="empty-message">No items yet. Start adding!</p>`;
        updateSummary();
        return;
    }
    
    const sorted = [...items].sort((a, b) => {
        // Sort by purchased status first, then by name
        if (a.purchased !== b.purchased) {
            return a.purchased ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
    });
    
    itemListEl.innerHTML = sorted.map(item => `
        <div class="item-card ${item.purchased ? 'purchased' : ''}">
            <div class="item-info">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-details">
                    <span>${item.quantity}x</span>
                    <span class="item-category">${item.category}</span>
                    ${item.purchased ? '✅ Purchased' : ''}
                </div>
            </div>
            <div class="item-actions">
                <button class="toggle-btn" data-id="${item.id}">
                    ${item.purchased ? '↩️' : '✅'}
                </button>
                <button class="delete-btn" data-id="${item.id}">✕</button>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            togglePurchased(parseInt(this.dataset.id));
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteItem(parseInt(this.dataset.id));
        });
    });
    
    updateSummary();
}

function updateSummary() {
    const total = items.length;
    const purchased = items.filter(i => i.purchased).length;
    const remaining = total - purchased;
    
    totalItemsEl.textContent = total;
    purchasedItemsEl.textContent = purchased;
    remainingItemsEl.textContent = remaining;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// 6. TELEGRAM MAIN BUTTON
// ============================================================

function updateMainButton() {
    const remaining = items.filter(i => !i.purchased).length;
    if (remaining > 0) {
        tg.MainButton.setText(`🛒 ${remaining} item${remaining > 1 ? 's' : ''} remaining`);
        tg.MainButton.show();
    } else if (items.length > 0) {
        tg.MainButton.setText('✅ All purchased!');
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

tg.MainButton.onClick(function() {
    const remaining = items.filter(i => !i.purchased);
    if (remaining.length === 0) {
        tg.showPopup({
            title: '🎉 All Done!',
            message: 'You have purchased everything on your list!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const itemList = remaining.map((i, idx) => 
        `${idx+1}. ${i.quantity}x ${i.name}`
    ).join('\n');
    
    tg.showPopup({
        title: `🛒 Remaining (${remaining.length})`,
        message: itemList,
        buttons: [{ type: 'close' }]
    });
});

// ============================================================
// 7. EVENT LISTENERS
// ============================================================

addItemBtn.addEventListener('click', addItem);

itemNameInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') addItem();
});

clearPurchasedBtn.addEventListener('click', clearPurchased);
clearAllBtn.addEventListener('click', clearAll);

// ============================================================
// 8. LOAD INITIAL DATA
// ============================================================

loadFromBackend();

console.log('✅ Shopping List Mini App is ready!');