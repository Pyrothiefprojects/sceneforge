const InventoryEditor = (() => {
    let items = [];
    let pendingImage = null;

    function addItem(name, imageData) {
        const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
        const item = { id, name, image: imageData, uses: 1 };
        items.push(item);
        return item;
    }

    function removeItem(id) {
        items = items.filter(i => i.id !== id);
    }

    function getItem(id) {
        return items.find(i => i.id === id) || null;
    }

    function getAllItems() {
        return items;
    }

    function loadItems(data) {
        items = data || [];
    }

    function renderItemList() {
        const container = document.getElementById('item-list');
        if (!container) return;

        if (items.length === 0) {
            container.innerHTML = '<span class="panel-label" style="color:var(--text-secondary); padding:8px 0;">No items defined. Add an item above.</span>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="scene-card item-card" data-id="${item.id}">
                <div class="scene-thumb item-thumb">
                    ${item.image
                        ? `<img src="${item.image}" alt="${item.name}">`
                        : '<span class="scene-thumb-empty">No icon</span>'}
                </div>
                <div class="scene-card-info">
                    <input class="scene-card-name" value="${item.name}" data-id="${item.id}" spellcheck="false">
                    <select class="item-uses-select" data-id="${item.id}">
                        <option value="1" ${item.uses === 1 || item.uses === undefined ? 'selected' : ''}>Single use</option>
                        <option value="2" ${item.uses === 2 ? 'selected' : ''}>2 uses</option>
                        <option value="3" ${item.uses === 3 ? 'selected' : ''}>3 uses</option>
                        <option value="infinite" ${item.uses === 'infinite' ? 'selected' : ''}>Reusable</option>
                    </select>
                </div>
                <button class="scene-card-delete" data-id="${item.id}" title="Remove item">&times;</button>
            </div>
        `).join('');

        // Rename inline
        container.querySelectorAll('.scene-card-name').forEach(input => {
            input.addEventListener('change', () => {
                const item = getItem(input.dataset.id);
                if (item) item.name = input.value.trim();
            });
        });

        // Uses
        container.querySelectorAll('.item-uses-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const item = getItem(sel.dataset.id);
                if (item) {
                    item.uses = sel.value === 'infinite' ? 'infinite' : parseInt(sel.value);
                }
            });
        });

        // Delete
        container.querySelectorAll('.scene-card-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                removeItem(btn.dataset.id);
                renderItemList();
            });
        });
    }

    function initToolbar() {
        const nameInput = document.getElementById('item-name');
        const loadImgBtn = document.getElementById('item-load-img');
        const fileInput = document.getElementById('item-file-input');
        const addBtn = document.getElementById('item-add');

        renderItemList();

        loadImgBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            pendingImage = 'assets/items/' + file.name;
            loadImgBtn.textContent = 'Icon loaded';
            loadImgBtn.style.borderColor = 'var(--accent-gold)';
            fileInput.value = '';
        });

        addBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name) return;
            addItem(name, pendingImage);
            nameInput.value = '';
            pendingImage = null;
            loadImgBtn.textContent = 'Load Icon';
            loadImgBtn.style.borderColor = '';
            renderItemList();
        });
    }

    return { addItem, removeItem, getItem, getAllItems, loadItems, renderItemList, initToolbar };
})();
