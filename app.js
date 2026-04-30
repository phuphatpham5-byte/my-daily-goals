// Thêm dữ liệu Flashcards và Module mới vào Layout để không bị lỗi bộ nhớ cũ
let appData = JSON.parse(localStorage.getItem('myDashboardData')) || {
    goals: {}, recall: [], 
    sheetData: [["Môn học", "Hệ số", "Điểm"], ["Toán", "2", "8.5"]],
    wheelItems: ["Ăn phở", "Học code", "Ngủ nướng"], 
    theme: { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' },
    layout: ['module-goals', 'module-sheets', 'module-wheel']
};

// Vá lỗi an toàn nếu là user từ phiên bản cũ
if (!appData.flashcards) appData.flashcards = [];
if (!appData.layout.includes('module-flashcards')) appData.layout.push('module-flashcards');
if (!appData.layout.includes('module-pomodoro')) appData.layout.push('module-pomodoro');

let currentDate = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(); restoreLayout(); initDragAndDrop();
    document.getElementById('date-picker').value = currentDate;
    document.getElementById('date-picker').addEventListener('change', (e) => { currentDate = e.target.value; renderGoals(); });
    document.getElementById('add-btn').addEventListener('click', addGoal);
    
    document.getElementById('wheel-items').value = appData.wheelItems.join('\n');
    
    renderGoals(); checkActiveRecall(); renderSheet(); updateWheel(); renderFC(); initPomo();
    
    document.getElementById('color-bg').addEventListener('input', updateTheme);
    document.getElementById('color-primary').addEventListener('input', updateTheme);
    document.getElementById('color-text').addEventListener('input', updateTheme);
    
    // Nút thêm Flashcard
    document.getElementById('add-fc-btn').addEventListener('click', addFC);
});

function saveData() { localStorage.setItem('myDashboardData', JSON.stringify(appData)); }

/* --- THEME & KÉO THẢ --- */
function updateTheme() {
    appData.theme.bg = document.getElementById('color-bg').value;
    appData.theme.primary = document.getElementById('color-primary').value;
    appData.theme.text = document.getElementById('color-text').value;
    applyTheme(); saveData();
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
            appData.layout = [...container.children].map(el => el.id);
            saveData();
        });
    });
    container.addEventListener('dragover', e => {
        e.preventDefault();
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) container.appendChild(draggable);
        else container.insertBefore(draggable, afterElement);
    });
}
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.draggable-module:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        else return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
function restoreLayout() {
    const container = document.getElementById('drag-container');
    appData.layout.forEach(id => { const el = document.getElementById(id); if(el) container.appendChild(el); });
}

/* --- GOALS, RECALL, SHEETS --- */
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
    if(goal) { goal.completed = isCompleted; saveData(); renderGoals(); }
}
function setRecall(id, title, days) {
    if(!days) return;
    const reviewDate = new Date(); reviewDate.setDate(reviewDate.getDate() + parseInt(days));
    const dateStr = reviewDate.toISOString().split('T')[0];
    appData.recall.push({ id: Date.now().toString(), title, dateToReview: dateStr });
    saveData(); alert(`Đã lên lịch ôn tập "${title}" vào ngày ${dateStr}`);
}
function checkActiveRecall() {
    const todayStr = new Date().toISOString().split('T')[0];
    const dueRecalls = appData.recall.filter(r => r.dateToReview <= todayStr);
    const noticeDiv = document.getElementById('recall-notice');
    const listUl = document.getElementById('recall-list');
    if(dueRecalls.length > 0) {
        noticeDiv.classList.remove('hidden');
        listUl.innerHTML = dueRecalls.map(r => `<li>${r.title} <button onclick="removeRecall('${r.id}')" style="padding:2px 5px; font-size:0.7rem">Xong</button></li>`).join('');
    } else { noticeDiv.classList.add('hidden'); }
}
function removeRecall(id) { appData.recall = appData.recall.filter(r => r.id !== id); saveData(); checkActiveRecall(); }
function renderGoals() {
    const container = document.getElementById('goal-container');
    const goals = appData.goals[currentDate] || [];
    container.innerHTML = goals.length ? '' : '<p>Chưa có mục tiêu.</p>';
    goals.forEach(goal => {
        const div = document.createElement('div'); div.className = `card ${goal.completed ? 'completed' : ''}`;
        let recallHtml = goal.completed ? `<select class="recall-select" onchange="setRecall('${goal.id}', '${goal.title}', this.value); this.value=''"><option value="">+ Lên lịch nhắc lại</option><option value="1">Nhắc lại sau 1 ngày</option><option value="3">Nhắc lại sau 3 ngày</option><option value="7">Nhắc lại sau 7 ngày</option></select>` : '';
        div.innerHTML = `<div style="display:flex; justify-content:space-between"><h4>${goal.title}</h4><input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoal('${goal.id}', this.checked)"></div>${recallHtml}`;
        container.appendChild(div);
    });
}
function renderSheet() {
    const table = document.getElementById('mini-sheet'); table.innerHTML = '';
    appData.sheetData.forEach((row, rIdx) => {
        const tr = document.createElement('tr');
        row.forEach((cell, cIdx) => {
            const td = document.createElement(rIdx === 0 ? 'th' : 'td');
            const input = document.createElement('input'); input.value = cell;
            input.onchange = (e) => { appData.sheetData[rIdx][cIdx] = e.target.value; saveData(); };
            td.appendChild(input); tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}
function sheetAddRow() { const colCount = appData.sheetData[0].length; appData.sheetData.push(new Array(colCount).fill("")); saveData(); renderSheet(); }
function sheetAddCol() { appData.sheetData.forEach(row => row.push("")); saveData(); renderSheet(); }
function calculateAverage() {
    let totalScore = 0, totalCredit = 0;
    const headers = appData.sheetData[0].map(h => h.toLowerCase().trim());
    const creditIdx = headers.findIndex(h => h.includes('hệ số'));
    const scoreIdx = headers.findIndex(h => h.includes('điểm'));
    if (creditIdx === -1 || scoreIdx === -1) { alert("Bảng cần có cột 'Hệ số' và 'Điểm'!"); return; }
    for (let i = 1; i < appData.sheetData.length; i++) {
        const credit = parseFloat(appData.sheetData[i][creditIdx]);
        const score = parseFloat(appData.sheetData[i][scoreIdx]);
        if (!isNaN(credit) && !isNaN(score)) { totalScore += (score * credit); totalCredit += credit; }
    }
    if (totalCredit > 0) alert(`📊 Điểm trung bình của bạn là: ${(totalScore / totalCredit).toFixed(2)}`);
    else alert("Không tìm thấy dữ liệu số hợp lệ để tính toán.");
}

/* --- VÒNG QUAY MAY MẮN --- */
let currentDegree = 0;
function updateWheel() {
    const itemsText = document.getElementById('wheel-items').value;
    appData.wheelItems = itemsText.split('\n').map(i => i.trim()).filter(i => i);
    document.getElementById('wheel-items').value = appData.wheelItems.join('\n');
    saveData();
    drawWheel();
}
function drawWheel() {
    const wheel = document.getElementById('wheel');
    wheel.innerHTML = ''; 
    const colors = ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0', '#ff9800', '#00bcd4', '#e91e63'];
    const total = appData.wheelItems.length;
    if (total === 0) { wheel.style.background = 'transparent'; return; }
    let gradientParts = [];
    const degreePerItem = 360 / total;
    
    for (let i = 0; i < total; i++) {
        const start = i * degreePerItem;
        const end = (i + 1) * degreePerItem;
        gradientParts.push(`${colors[i % colors.length]} ${start}deg ${end}deg`);
        
        const midAngle = start + (degreePerItem / 2);
        const wrapper = document.createElement('div');
        wrapper.className = 'wheel-text-wrapper';
        
        let rotateAngle = midAngle - 90;
        wrapper.style.transform = `rotate(${rotateAngle}deg)`;
        
        const textSpan = document.createElement('span');
        textSpan.className = 'wheel-text';
        textSpan.innerText = appData.wheelItems[i];
        
        let actualRotate = rotateAngle % 360;
        if (actualRotate < 0) actualRotate += 360;
        if (actualRotate > 90 && actualRotate < 270) {
            textSpan.style.display = 'inline-block';
            textSpan.style.transform = 'rotate(180deg)';
            wrapper.style.justifyContent = 'flex-start';
            wrapper.style.paddingLeft = '20px';
            wrapper.style.paddingRight = '0';
        }
        
        wrapper.appendChild(textSpan);
        wheel.appendChild(wrapper);
    }
    wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`;
}
function spinWheel() {
    if(appData.wheelItems.length === 0) return;
    const btn = document.getElementById('spin-btn');
    btn.disabled = true; document.getElementById('wheel-result').innerText = 'Đang quay...';
    
    const extraSpins = (Math.floor(Math.random() * 5) + 5) * 360;
    const randomDegree = Math.floor(Math.random() * 360);
    currentDegree += extraSpins + randomDegree;
    
    const wheel = document.getElementById('wheel');
    wheel.style.transform = `rotate(${currentDegree}deg)`;
    
    setTimeout(() => {
        const actualDegree = currentDegree % 360;
        const degreePerItem = 360 / appData.wheelItems.length;
        const index = Math.floor((360 - actualDegree) / degreePerItem) % appData.wheelItems.length;
        document.getElementById('wheel-result').innerText = `🎉 Kết quả: ${appData.wheelItems[index]}`;
        btn.disabled = false;
    }, 4000);
}


/* ====================================================
   TÍNH NĂNG MỚI: FLASHCARDS LẬT 3D & ACTIVE RECALL
==================================================== */
function addFC() {
    const q = document.getElementById('fc-q').value.trim();
    const a = document.getElementById('fc-a').value.trim();
    if(!q || !a) return alert("Vui lòng nhập đủ Câu hỏi và Đáp án!");
    
    appData.flashcards.push({ id: Date.now().toString(), q: q, a: a });
    document.getElementById('fc-q').value = '';
    document.getElementById('fc-a').value = '';
    saveData(); 
    renderFC();
}

function renderFC() {
    const container = document.getElementById('fc-container');
    document.getElementById('fc-count').innerText = appData.flashcards.length;
    container.innerHTML = '';
    
    if(appData.flashcards.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888; grid-column: 1/-1;">Chưa có thẻ nào. Hãy tạo thẻ đầu tiên!</p>';
        return;
    }

    appData.flashcards.forEach(fc => {
        const card = document.createElement('div');
        card.className = 'flashcard';
        // Click để lật thẻ (Chỉ lật khi không click vào button)
        card.onclick = (e) => {
            if(e.target.tagName !== 'BUTTON') card.classList.toggle('flipped');
        };
        
        card.innerHTML = `
            <div class="fc-inner">
                <div class="fc-front">${fc.q}</div>
                <div class="fc-back">
                    <div class="fc-back-text">${fc.a}</div>
                    <div class="fc-actions">
                        <button onclick="removeFC('${fc.id}', event)" style="background: var(--coral-red);">Đã hiểu</button>
                        <button onclick="keepFC(event)" style="background: #4CAF50;">Nhớ nhớ</button>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function removeFC(id, e) {
    e.stopPropagation(); // Ngăn sự kiện click lật thẻ
    appData.flashcards = appData.flashcards.filter(f => f.id !== id);
    saveData(); 
    renderFC();
}

function keepFC(e) {
    e.stopPropagation(); 
    e.target.closest('.flashcard').classList.remove('flipped'); // Lật thẻ úp lại để review sau
}


/* ====================================================
   TÍNH NĂNG MỚI: POMODORO TIMER VÒNG TRÒN SVG
==================================================== */
let pomoState = 'idle'; // Trạng thái: idle, work, rest, paused
let pomoInterval;
let timeRemaining = 0;
let totalTime = 0;
const CIRCUMFERENCE = 377; // Chu vi SVG: 2 * PI * r(60) = 376.99

function initPomo() {
    document.getElementById('pomo-start').onclick = startPomo;
    document.getElementById('pomo-pause').onclick = pausePomo;
    document.getElementById('pomo-reset').onclick = resetPomo;
    document.getElementById('pomo-work-sel').onchange = resetPomo;
    document.getElementById('pomo-rest-sel').onchange = resetPomo;
    
    updatePomoDisplay(parseInt(document.getElementById('pomo-work-sel').value) * 60, 'work');
    updatePomoDisplay(parseInt(document.getElementById('pomo-rest-sel').value) * 60, 'rest');
}

function startPomo() {
    if(pomoState === 'idle') {
        pomoState = 'work';
        totalTime = parseInt(document.getElementById('pomo-work-sel').value) * 60;
        timeRemaining = totalTime;
        document.getElementById('box-work').classList.add('active');
        document.getElementById('box-rest').classList.remove('active');
    } else if (pomoState === 'paused') {
        pomoState = document.getElementById('box-work').classList.contains('active') ? 'work' : 'rest';
    }
    
    clearInterval(pomoInterval);
    pomoInterval = setInterval(pomoTick, 1000);
}

function pausePomo() {
    clearInterval(pomoInterval);
    pomoState = 'paused';
}

function resetPomo() {
    clearInterval(pomoInterval);
    pomoState = 'idle';
    document.getElementById('box-work').classList.add('active');
    document.getElementById('box-rest').classList.remove('active');
    
    updatePomoDisplay(parseInt(document.getElementById('pomo-work-sel').value) * 60, 'work');
    updatePomoDisplay(parseInt(document.getElementById('pomo-rest-sel').value) * 60, 'rest');
    
    document.getElementById('ring-work').style.strokeDashoffset = 0;
    document.getElementById('ring-rest').style.strokeDashoffset = 0;
}

function pomoTick() {
    timeRemaining--;
    
    if(timeRemaining < 0) {
        // Đổi trạng thái khi hết giờ
        if(pomoState === 'work') {
            pomoState = 'rest';
            totalTime = parseInt(document.getElementById('pomo-rest-sel').value) * 60;
            timeRemaining = totalTime;
            document.getElementById('box-work').classList.remove('active');
            document.getElementById('box-rest').classList.add('active');
            document.getElementById('ring-work').style.strokeDashoffset = 0; // Reset vòng quay
            alert("⏰ Hết giờ học! Hãy đứng dậy vươn vai và nghỉ ngơi nhé!");
        } else {
            pomoState = 'work';
            totalTime = parseInt(document.getElementById('pomo-work-sel').value) * 60;
            timeRemaining = totalTime;
            document.getElementById('box-work').classList.add('active');
            document.getElementById('box-rest').classList.remove('active');
            document.getElementById('ring-rest').style.strokeDashoffset = 0;
            alert("⏰ Hết giờ nghỉ! Quay lại tập trung học nào!");
        }
    }
    
    updatePomoDisplay(timeRemaining, pomoState);
}

function updatePomoDisplay(seconds, type) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    document.getElementById(`time-${type}`).innerText = `${m}:${s}`;
    
    if(totalTime > 0 && timeRemaining <= totalTime) {
        const circle = document.getElementById(`ring-${type}`);
        // Tính toán độ lùi của nét đứt vòng tròn (Giảm dần về 00:00)
        const offset = CIRCUMFERENCE - (seconds / totalTime) * CIRCUMFERENCE;
        circle.style.strokeDashoffset = offset;
    }
}

// Xóa Data chung
document.getElementById('clear-btn').addEventListener('click', () => {
    if(confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?')) {
        localStorage.removeItem('myDashboardData'); location.reload();
    }
});
