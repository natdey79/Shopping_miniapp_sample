console.log('🛒 Shopping List App Loading...');

// ============================================================
// 1. INITIALIZE TELEGRAM
// ============================================================
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Show user name
const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('user-greeting').textContent = 
        `Welcome, ${user.first_name}! 👋`;
}

// ============================================================
// 2. DATA
// ============================================================
let items = [];

// Load from localStorage
function loadItems() {
    try {
        const saved = localStorage.getItem('shopping_items');
        if (saved) {
            items = JSON.parse(saved);
            console.log('📦 Loaded items:', items.length);
        }
    } catch (e) {
        console.error('Error loading:', e);
        items = [];
    }
    renderItems();
}

// Save to localStorage
function saveItems() {
    try {
        localStorage.setItem('shopping_items', JSON.stringify(items));
        console.log('💾 Saved items:', items.length);
    } catch (e) {
        console.error('Error saving:', e);
    }
}

// ============================================================
// 3. GET ELEMENTS (with error checking)
// ============================================================
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.error('❌ Element not found:', id);
    }
    return el;
}

const itemName = getElement('item-name');
const itemQty = getElement('item-quantity');
const itemCategory = getElement('item-category');
const addBtn = getElement('add-item-btn');
const itemList = getElement('item-list');
const totalEl = getElement('total-items');
const purchasedEl = getElement('purchased-items');
const remainingEl = getElement('remaining-items');
const clearPurchasedBtn = getElement('clear-purchased-btn');
const clearAllBtn = getElement('clear-all-btn');

// ============================================================
// 4. CORE FUNCTIONS (Simple & Tested)
// ============================================================

// Add item
function addItem() {
    console.log('➕ Add button clicked');
    
    const name = itemName.value.trim();
    const quantity = parseInt(itemQty.value) || 1;
    const category = itemCategory.value;
    
    if (!name) {
        tg.showPopup({
            title: '⚠️ Missing Info',
            message: 'Please enter an item name.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    const newItem = {
        id: Date.now(),
        name: name,
        quantity: quantity,
        category: category,
        purchased: false
    };
    
    items.push(newItem);
    saveItems();
    renderItems();
    
    itemName.value = '';
    itemQty.value = '1';
    
    tg.HapticFeedback.notificationOccurred('success');
    updateMainButton();
    
    console.log('✅ Item added:', newItem);
}

// Toggle purchased
function togglePurchased(id) {
    console.log('🔄 Toggle item:', id);
    const item = items.find(i => i.id === id);
    if (item) {
        item.purchased = !item.purchased;
        saveItems();
        renderItems();
        tg.HapticFeedback.impactOccurred('light');
        updateMainButton();
    }
}

// Delete item
function deleteItem(id) {
    console.log('🗑️ Delete item:', id);
    items = items.filter(i => i.id !== id);
    saveItems();
    renderItems();
    tg.HapticFeedback.impactOccurred('medium');
    updateMainButton();
}

// Clear purchased
function clearPurchased() {
    console.log('🧹 Clear Purchased clicked');
    const purchased = items.filter(i => i.purchased);
    
    if (purchased.length === 0) {
        tg.showPopup({
            title: '🧹 Nothing to Clear',
            message: 'No purchased items to remove.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    tg.showPopup({
        title: '🧹 Clear Purchased?',
        message: `Remove ${purchased.length} purchased item(s)?`,
        buttons: [{ type: 'cancel' }, { type: 'ok' }]
    }, function(buttonIndex) {
        if (buttonIndex === 1) {
            items = items.filter(i => !i.purchased);
            saveItems();
            renderItems();
            tg.HapticFeedback.notificationOccurred('success');
            updateMainButton();
            console.log('✅ Cleared purchased items');
        }
    });
}

// Clear all
function clearAll() {
    console.log('🗑️ Clear All clicked');
    
    if (items.length === 0) {
        tg.showPopup({
            title: '📭 Empty List',
            message: 'Your shopping list is already empty.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    
    tg.showPopup({
        title: '⚠️ Clear All?',
        message: `Delete all ${items.length} items?`,
        buttons: [{ type: 'cancel' }, { type: 'ok' }]
    }, function(buttonIndex) {
        if (buttonIndex === 1) {
            items = [];
            saveItems();
            renderItems();
            tg.HapticFeedback.notificationOccurred('warning');
            updateMainButton();
            console.log('✅ Cleared all items');
        }
    });
}

// ============================================================
// 5. RENDER
// ============================================================
function renderItems() {
    console.log('🔄 Rendering items:', items.length);
    
    if (items.length === 0) {
        itemList.innerHTML = `<p class="empty-message">No items yet. Start adding!</p>`;
        updateSummary();
        return;
    }
    
    const sorted = [...items].sort((a, b) => {
        if (a.purchased !== b.purchased) {
            return a.purchased ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
    });
    
    itemList.innerHTML = sorted.map(item => `
        <div class="item-card ${item.purchased ? 'purchased' : ''}">
            <div class="item-info">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-details">
                    <span>${item.quantity}x</span>
                    <span class="item-category">${escapeHtml(item.category)}</span>
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
    
    // Attach event listeners
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
    
    if (totalEl) totalEl.textContent = total;
    if (purchasedEl) purchasedEl.textContent = purchased;
    if (remainingEl) remainingEl.textContent = remaining;
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
        tg.MainButton.setText('✅ All purchased! 🎉');
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

tg.MainButton.onClick(function() {
    const remaining = items.filter(i => !i.purchased);
    if (remaining.length === 0 && items.length > 0) {
        tg.showPopup({
            title: '🎉 All Done!',
            message: 'You have purchased everything on your list!',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    if (items.length === 0) {
        tg.showPopup({
            title: '📭 Empty List',
            message: 'Your shopping list is empty.',
            buttons: [{ type: 'ok' }]
        });
        return;
    }
    const list = remaining.map((i, idx) => 
        `${idx+1}. ${i.quantity}x ${i.name}`
    ).join('\n');
    tg.showPopup({
        title: `🛒 Remaining (${remaining.length})`,
        message: list,
        buttons: [{ type: 'close' }]
    });
});

// ============================================================
// 7. ATTACH EVENT LISTENERS (with console logs)
// ============================================================

if (addBtn) {
    addBtn.addEventListener('click', function(e) {
        console.log('🔘 Add button clicked via event listener');
        addItem();
    });
    console.log('✅ Add button attached');
} else {
    console.error('❌ Add button not found!');
}

if (clearPurchasedBtn) {
    clearPurchasedBtn.addEventListener('click', function(e) {
        console.log('🔘 Clear Purchased button clicked');
        clearPurchased();
    });
    console.log('✅ Clear Purchased button attached');
} else {
    console.error('❌ Clear Purchased button not found!');
}

if (clearAllBtn) {
    clearAllBtn.addEventListener('click', function(e) {
        console.log('🔘 Clear All button clicked');
        clearAll();
    });
    console.log('✅ Clear All button attached');
} else {
    console.error('❌ Clear All button not found!');
}

// Enter key on name field
if (itemName) {
    itemName.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            console.log('⌨️ Enter key pressed');
            addItem();
        }
    });
}

// ============================================================
// 8. START APP
// ============================================================
loadItems();
updateMainButton();

console.log('✅ Shopping List App is ready!');
console.log('📊 Items loaded:', items.length);
console.log('📌 Check your buttons:');
console.log('   - Add button:', addBtn ? '✅ Found' : '❌ Missing');
console.log('   - Clear Purchased:', clearPurchasedBtn ? '✅ Found' : '❌ Missing');
console.log('   - Clear All:', clearAllBtn ? '✅ Found' : '❌ Missing');
