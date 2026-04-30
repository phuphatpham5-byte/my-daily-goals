// --- 1. KHỞI TẠO DỮ LIỆU & STATE ---
let appData = JSON.parse(localStorage.getItem('myDashboardData')) || {
    goals: {},
    recall: [], // Dữ liệu Active Recall: { id, title, dateToReview }
    sheetData: [
        ["Môn học", "Hệ số", "Điểm"], 
        ["Toán", "2", "8.5"],
        ["Lý", "1", "7.0"]
    ],
    wheelItems: ["Ăn phở", "Học code", "Ngủ nướng"],
    theme: { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' },
    layout: ['module-goals', 'module-sheets', 'module-wheel']
};

let currentDate = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    restoreLayout();
    initDragAndDrop();
    
    // Khởi tạo Goals
    document.getElementById('date-picker').value = currentDate;
    document.getElementById('date-picker').addEventListener('change', (e) => { currentDate = e.target.value; renderGoals(); });
    document.getElementById('add-btn').addEventListener('click', addGoal);
    
    // Khởi tạo các Module
    renderGoals();
    checkActiveRecall();
    renderSheet();
    updateWheel();

    // Event Theme
    document.getElementById('color-bg').addEventListener('input', updateTheme);
    document.getElementById('color-primary').addEventListener('input', updateTheme);
    document.getElementById('color-text').addEventListener('input', updateTheme);
});

function saveData() {
    localStorage.setItem('myDashboardData', JSON.stringify(appData));
}

// --- 2. TÙY CHỈNH UI (Theme & Kéo thả) ---
function updateTheme(e) {
    appData.theme.bg = document.getElementById('color-bg').value;
    appData.theme.primary = document.getElementById('color-primary').value;
    appData.theme.text = document.getElementById('color-text').value;
    applyTheme();
    saveData();
}

function applyTheme() {
    document.documentElement.style.setProperty('--bg-color', appData.theme.bg);
    document.documentElement.style.setProperty('--primary-color', appData.theme.primary);
    document.documentElement.style.setProperty('--text-color', appData.theme.text);
    document.getElementById('color-bg').value = appData.theme.bg;
    document.getElementById('color-primary').value = appData.theme.primary;
    document.getElementById('color-text').value = appData.theme.text;
}

function resetTheme() {
    appData.theme = { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' };
    applyTheme(); saveData();
}

function initDragAndDrop() {
    const draggables = document.querySelectorAll('.draggable-module');
    const container = document.getElementById('drag-container');

    draggables.forEach(draggable => {
        draggable.addEventListener('dragstart', () => draggable.classList.add('dragging'));
        draggable.addEventListener('dragend', () => {
            draggable.classList.remove('dragging');
            // Lưu thứ tự mới
            appData.layout = [...container.children].map(el => el.id);
            saveData();
        });
    });

    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-module:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function restoreLayout() {
    const container = document.getElementById('drag-container');
    appData.layout.forEach(id => {
        const el = document.getElementById(id);
        if(el) container.appendChild(el);
    });
}

// --- 3. MỤC TIÊU & ACTIVE RECALL ---
function addGoal() {
    const title = document.getElementById('goal-input').value.trim();
    if (!title) return;
    if (!appData.goals[currentDate]) appData.goals[currentDate] = [];
    appData.goals[currentDate].push({ id: Date.now().toString(), title, completed: false });
    document.getElementById('goal-input').value = '';
    saveData(); renderGoals();
}

function toggleGoal(id, isCompleted) {
    const goal = appData.goals[currentDate].find(g => g.id === id);
    if(goal) {
        goal.completed = isCompleted;
        saveData(); renderGoals();
    }
}

function setRecall(id, title, days) {
    if(!days) return;
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + parseInt(days));
    const dateStr = reviewDate.toISOString().split('T')[0];
    
    appData.recall.push({ id: Date.now().toString(), title, dateToReview: dateStr });
    saveData();
    alert(`Đã lên lịch ôn tập "${title}" vào ngày ${dateStr}`);
}

function checkActiveRecall() {
    const todayStr = new Date().toISOString().split('T')[0];
    const dueRecalls = appData.recall.filter(r => r.dateToReview <= todayStr);
    
    const noticeDiv = document.getElementById('recall-notice');
    const listUl = document.getElementById('recall-list');
    
    if(dueRecalls.length > 0) {
        noticeDiv.classList.remove('hidden');
        listUl.innerHTML = dueRecalls.map(r => `<li>${r.title} <button onclick="removeRecall('${r.id}')" style="padding:2px 5px; font-size:0.7rem">Xong</button></li>`).join('');
    } else {
        noticeDiv.classList.add('hidden');
    }
}

function removeRecall(id) {
    appData.recall = appData.recall.filter(r => r.id !== id);
    saveData(); checkActiveRecall();
}

function renderGoals() {
    const container = document.getElementById('goal-container');
    const goals = appData.goals[currentDate] || [];
    container.innerHTML = goals.length ? '' : '<p>Chưa có mục tiêu.</p>';

    goals.forEach(goal => {
        const div = document.createElement('div');
        div.className = `card ${goal.completed ? 'completed' : ''}`;
        
        let recallHtml = goal.completed ? `
            <select class="recall-select" onchange="setRecall('${goal.id}', '${goal.title}', this.value); this.value=''">
                <option value="">+ Lên lịch nhắc lại (Active Recall)</option>
                <option value="1">Nhắc lại sau 1 ngày</option>
                <option value="3">Nhắc lại sau 3 ngày</option>
                <option value="7">Nhắc lại sau 7 ngày</option>
            </select>
        ` : '';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <h4>${goal.title}</h4>
                <input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoal('${goal.id}', this.checked)">
            </div>
            ${recallHtml}
        `;
        container.appendChild(div);
    });
}

// --- 4. BẢNG THỐNG KÊ (MINI SHEETS) ---
function renderSheet() {
    const table = document.getElementById('mini-sheet');
    table.innerHTML = '';
    appData.sheetData.forEach((row, rIdx) => {
        const tr = document.createElement('tr');
        row.forEach((cell, cIdx) => {
            const td = document.createElement(rIdx === 0 ? 'th' : 'td');
            const input = document.createElement('input');
            input.value = cell;
            input.onchange = (e) => {
                appData.sheetData[rIdx][cIdx] = e.target.value;
                saveData();
            };
            td.appendChild(input);
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}

function sheetAddRow() {
    const colCount = appData.sheetData[0].length;
    appData.sheetData.push(new Array(colCount).fill(""));
    saveData(); renderSheet();
}

function sheetAddCol() {
    appData.sheetData.forEach(row => row.push(""));
    saveData(); renderSheet();
}

// Tính năng đặc biệt: Tính điểm trung bình (Hệ số x Điểm)
function calculateAverage() {
    let totalScore = 0;
    let totalCredit = 0;
    
    // Cố gắng tìm cột "Hệ số" và "Điểm"
    const headers = appData.sheetData[0].map(h => h.toLowerCase().trim());
    const creditIdx = headers.findIndex(h => h.includes('hệ số'));
    const scoreIdx = headers.findIndex(h => h.includes('điểm'));

    if (creditIdx === -1 || scoreIdx === -1) {
        alert("Bảng cần có cột 'Hệ số' và 'Điểm' để tính toán tự động!");
        return;
    }

    for (let i = 1; i < appData.sheetData.length; i++) {
        const credit = parseFloat(appData.sheetData[i][creditIdx]);
        const score = parseFloat(appData.sheetData[i][scoreIdx]);
        if (!isNaN(credit) && !isNaN(score)) {
            totalScore += (score * credit);
            totalCredit += credit;
        }
    }

    if (totalCredit > 0) {
        const avg = (totalScore / totalCredit).toFixed(2);
        alert(`📊 Điểm trung bình của bạn là: ${avg}`);
    } else {
        alert("Không tìm thấy dữ liệu số hợp lệ để tính toán.");
    }
}

// --- 5. VÒNG QUAY MAY MẮN ---
let currentDegree = 0;
function updateWheel() {
    const items = document.getElementById('wheel-items').value || appData.wheelItems.join(', ');
    appData.wheelItems = items.split(',').map(i => i.trim()).filter(i => i);
    document.getElementById('wheel-items').value = appData.wheelItems.join(', ');
    saveData();
    drawWheel();
}

function drawWheel() {
    const colors = ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0', '#ff9800'];
    const total = appData.wheelItems.length;
    if (total === 0) return;
    
    let gradientParts = [];
    const degreePerItem = 360 / total;
    
    for (let i = 0; i < total; i++) {
        const start = i * degreePerItem;
        const end = (i + 1) * degreePerItem;
        gradientParts.push(`${colors[i % colors.length]} ${start}deg ${end}deg`);
    }
    
    document.getElementById('wheel').style.background = `conic-gradient(${gradientParts.join(', ')})`;
}

function spinWheel() {
    if(appData.wheelItems.length === 0) return;
    const btn = document.getElementById('spin-btn');
    btn.disabled = true;
    
    // Random góc quay thêm (từ 5 đến 10 vòng)
    const extraSpins = (Math.floor(Math.random() * 5) + 5) * 360;
    const randomDegree = Math.floor(Math.random() * 360);
    currentDegree += extraSpins + randomDegree;
    
    const wheel = document.getElementById('wheel');
    wheel.style.transform = `rotate(${currentDegree}deg)`;
    
    setTimeout(() => {
        // Tính toán phần thưởng trúng
        const actualDegree = currentDegree % 360;
        const degreePerItem = 360 / appData.wheelItems.length;
        // Pointer nằm ở đỉnh (0 độ), mảng vẽ xuôi chiều kim đồng hồ, wheel quay xuôi
        const index = Math.floor((360 - actualDegree) / degreePerItem) % appData.wheelItems.length;
        
        document.getElementById('wheel-result').innerText = `🎉 Kết quả: ${appData.wheelItems[index]}`;
        btn.disabled = false;
    }, 3000); // 3 giây khớp với transition trong CSS
}

// Xóa Data
document.getElementById('clear-btn').addEventListener('click', () => {
    if(confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?')) {
        localStorage.removeItem('myDashboardData');
        location.reload();
    }
});
