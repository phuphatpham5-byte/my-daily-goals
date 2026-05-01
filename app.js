// Cập nhật cấu trúc bộ nhớ
let appData = JSON.parse(localStorage.getItem('myDashboardData')) || {
    goals: {}, recall: [], 
    sheetData: [["Môn học", "Hệ số", "Điểm"], ["Toán", "2", "8.5"]],
    wheelItems: ["Ăn phở", "Học code", "Ngủ nướng"], 
    theme: { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' },
    layout: ['module-goals', 'module-sheets', 'module-wheel']
};

// Vá lỗi an toàn để load tính năng mới
if (!appData.flashcards) appData.flashcards = [];
if (!appData.habits) appData.habits = []; // Mảng dữ liệu chứa Habit Tracker dài hạn
if (!appData.layout.includes('module-flashcards')) appData.layout.push('module-flashcards');
if (!appData.layout.includes('module-pomodoro')) appData.layout.push('module-pomodoro');
if (!appData.layout.includes('module-habits')) appData.layout.splice(1, 0, 'module-habits');

let currentDate = new Date().toISOString().split('T')[0];

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(); restoreLayout(); initDragAndDrop();
    document.getElementById('date-picker').value = currentDate;
    document.getElementById('date-picker').addEventListener('change', (e) => { currentDate = e.target.value; renderGoals(); });
    document.getElementById('add-btn').addEventListener('click', addGoal);
    
    document.getElementById('wheel-items').value = appData.wheelItems.join('\n');
    
    renderGoals(); checkActiveRecall(); renderSheet(); updateWheel(); renderFC(); initPomo(); renderHabits();
    
    document.getElementById('color-bg').addEventListener('input', updateTheme);
    document.getElementById('color-primary').addEventListener('input', updateTheme);
    document.getElementById('color-text').addEventListener('input', updateTheme);
    document.getElementById('add-fc-btn').addEventListener('click', addFC);
});

function saveData() { localStorage.setItem('myDashboardData', JSON.stringify(appData)); }

/* --- THEME & KÉO THẢ --- */
function updateTheme() { appData.theme.bg = document.getElementById('color-bg').value; appData.theme.primary = document.getElementById('color-primary').value; appData.theme.text = document.getElementById('color-text').value; applyTheme(); saveData(); }
function applyTheme() { document.documentElement.style.setProperty('--bg-color', appData.theme.bg); document.documentElement.style.setProperty('--primary-color', appData.theme.primary); document.documentElement.style.setProperty('--text-color', appData.theme.text); document.getElementById('color-bg').value = appData.theme.bg; document.getElementById('color-primary').value = appData.theme.primary; document.getElementById('color-text').value = appData.theme.text; }
function resetTheme() { appData.theme = { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' }; applyTheme(); saveData(); }
function initDragAndDrop() { const draggables = document.querySelectorAll('.draggable-module'); const container = document.getElementById('drag-container'); draggables.forEach(draggable => { draggable.addEventListener('dragstart', () => draggable.classList.add('dragging')); draggable.addEventListener('dragend', () => { draggable.classList.remove('dragging'); appData.layout = [...container.children].map(el => el.id); saveData(); }); }); container.addEventListener('dragover', e => { e.preventDefault(); const afterElement = getDragAfterElement(container, e.clientY); const draggable = document.querySelector('.dragging'); if (afterElement == null) container.appendChild(draggable); else container.insertBefore(draggable, afterElement); }); }
function getDragAfterElement(container, y) { const draggableElements = [...container.querySelectorAll('.draggable-module:not(.dragging)')]; return draggableElements.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) return { offset: offset, element: child }; else return closest; }, { offset: Number.NEGATIVE_INFINITY }).element; }
function restoreLayout() { const container = document.getElementById('drag-container'); appData.layout.forEach(id => { const el = document.getElementById(id); if(el) container.appendChild(el); }); }

/* --- TÍNH NĂNG MỚI: TÍCH HỢP HABIT TRACKING TRONG HÀM TẠO GOAL (CŨ) --- */
function addGoal() {
    const title = document.getElementById('goal-input').value.trim();
    if (!title) return;

    const endDateInput = document.getElementById('end-date-picker');
    const endDate = endDateInput ? endDateInput.value : '';

    // KIỂM TRA: NẾU CÓ ĐIỀN ĐẾN NGÀY -> ĐẨY VÀO HABIT TRACKER
    if (endDate && endDate >= currentDate) {
        appData.habits.push({
            id: 'h_' + Date.now(),
            title: title,
            startDate: currentDate,
            endDate: endDate,
            progressMap: {} // Lưu trạng thái đánh dấu của từng ngày
        });
        if(endDateInput) endDateInput.value = ''; // Reset
        document.getElementById('goal-input').value = '';
        saveData(); 
        renderHabits();
        return; // Dừng lại, không chạy code cũ bên dưới
    }

    // NẾU KHÔNG CÓ ĐẾN NGÀY -> CHẠY 100% CODE CŨ ĐỂ TẠO MỤC TIÊU HÀNG NGÀY
    if (!appData.goals[currentDate]) appData.goals[currentDate] = [];
    appData.goals[currentDate].push({ id: Date.now().toString(), title, completed: false });
    document.getElementById('goal-input').value = '';
    saveData(); renderGoals();
}

/* --- TÍNH NĂNG MỚI: RENDER BẢNG TIẾN TRÌNH HABIT TRACKER GIỐNG NOTION --- */
function renderHabits() {
    const container = document.getElementById('habit-table');
    if (!container) return;
    container.innerHTML = '';
    
    if (!appData.habits || appData.habits.length === 0) {
        container.innerHTML = '<tr><td style="padding: 20px; color: #888;">Chưa có Habit nào. Hãy chọn "Từ ngày" và "Đến ngày" ở bảng tạo mục tiêu để tracking!</td></tr>';
        return;
    }

    // Tìm khoảng thời gian nhỏ nhất và lớn nhất để vẽ số cột ngày
    let minDate = appData.habits[0].startDate;
    let maxDate = appData.habits[0].endDate;
    appData.habits.forEach(h => {
        if (h.startDate < minDate) minDate = h.startDate;
        if (h.endDate > maxDate) maxDate = h.endDate;
    });

    let dates = [];
    let minD = new Date(minDate + "T00:00:00");
    let maxD = new Date(maxDate + "T00:00:00");
    let curr = new Date(minD);
    
    // Tạo mảng các ngày để làm Header bảng
    while(curr <= maxD) {
        let y = curr.getFullYear();
        let m = String(curr.getMonth() + 1).padStart(2, '0');
        let d = String(curr.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
    }

    // Vẽ Header
    let thead = document.createElement('thead');
    let hr = document.createElement('tr');
    hr.innerHTML = `<th class="habit-name-cell">My Habits</th>`;
    dates.forEach(d => {
        let dObj = new Date(d + "T00:00:00");
        let dayStr = dObj.getDate() + '/' + (dObj.getMonth()+1);
        hr.innerHTML += `<th title="${d}">📅<br>${dayStr}</th>`;
    });
    hr.innerHTML += `<th>Progress</th>`;
    hr.innerHTML += `<th>...</th>`;
    thead.appendChild(hr);
    container.appendChild(thead);

    // Vẽ Body
    let tbody = document.createElement('tbody');
    appData.habits.forEach(habit => {
        let tr = document.createElement('tr');
        tr.innerHTML += `<td class="habit-name-cell">🚀 ${habit.title}</td>`;

        let totalDaysInHabit = 0;
        let checkedDays = 0;

        dates.forEach(d => {
            let td = document.createElement('td');
            // Nếu ngày đang vẽ nằm trong khoảng thời gian của Habit này
            if (d >= habit.startDate && d <= habit.endDate) {
                totalDaysInHabit++;
                let isChecked = habit.progressMap[d] ? 'checked' : '';
                if(isChecked) checkedDays++;
                td.innerHTML = `<input type="checkbox" class="habit-checkbox" ${isChecked} onchange="toggleHabit('${habit.id}', '${d}', this.checked)">`;
            } else {
                td.innerHTML = `<span style="color:#444">-</span>`; // Ngoài vùng
            }
            tr.appendChild(td);
        });

        // Tính %
        let pct = totalDaysInHabit > 0 ? Math.round((checkedDays / totalDaysInHabit) * 100) : 0;
        tr.innerHTML += `<td class="habit-progress-cell">${pct}%</td>`;
        tr.innerHTML += `<td><button onclick="deleteHabit('${habit.id}')" style="background:transparent; color: var(--coral-red);">🗑</button></td>`;
        tbody.appendChild(tr);
    });
    container.appendChild(tbody);
}

function toggleHabit(habitId, dateStr, isChecked) {
    let habit = appData.habits.find(h => h.id === habitId);
    if (habit) { habit.progressMap[dateStr] = isChecked; saveData(); renderHabits(); }
}
function deleteHabit(habitId) {
    if(confirm("Bạn có chắc muốn xóa Habit tracking này?")) {
        appData.habits = appData.habits.filter(h => h.id !== habitId); saveData(); renderHabits();
    }
}

/* --- RECALL, SHEETS, WHEEL (GIỮ NGUYÊN CODE CŨ BÊN DƯỚI) --- */
function toggleGoal(id, isCompleted) { const goal = appData.goals[currentDate].find(g => g.id === id); if(goal) { goal.completed = isCompleted; saveData(); renderGoals(); } }
function setRecall(id, title, days) { if(!days) return; const reviewDate = new Date(); reviewDate.setDate(reviewDate.getDate() + parseInt(days)); const dateStr = reviewDate.toISOString().split('T')[0]; appData.recall.push({ id: Date.now().toString(), title, dateToReview: dateStr }); saveData(); alert(`Đã lên lịch ôn tập "${title}" vào ngày ${dateStr}`); }
function checkActiveRecall() { const todayStr = new Date().toISOString().split('T')[0]; const dueRecalls = appData.recall.filter(r => r.dateToReview <= todayStr); const noticeDiv = document.getElementById('recall-notice'); const listUl = document.getElementById('recall-list'); if(dueRecalls.length > 0) { noticeDiv.classList.remove('hidden'); listUl.innerHTML = dueRecalls.map(r => `<li>${r.title} <button onclick="removeRecall('${r.id}')" style="padding:2px 5px; font-size:0.7rem">Xong</button></li>`).join(''); } else { noticeDiv.classList.add('hidden'); } }
function removeRecall(id) { appData.recall = appData.recall.filter(r => r.id !== id); saveData(); checkActiveRecall(); }
function renderGoals() { const container = document.getElementById('goal-container'); const goals = appData.goals[currentDate] || []; container.innerHTML = goals.length ? '' : '<p>Chưa có mục tiêu.</p>'; goals.forEach(goal => { const div = document.createElement('div'); div.className = `card ${goal.completed ? 'completed' : ''}`; let recallHtml = goal.completed ? `<select class="recall-select" onchange="setRecall('${goal.id}', '${goal.title}', this.value); this.value=''"><option value="">+ Lên lịch nhắc lại</option><option value="1">Nhắc lại sau 1 ngày</option><option value="3">Nhắc lại sau 3 ngày</option><option value="7">Nhắc lại sau 7 ngày</option></select>` : ''; div.innerHTML = `<div style="display:flex; justify-content:space-between"><h4>${goal.title}</h4><input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="toggleGoal('${goal.id}', this.checked)"></div>${recallHtml}`; container.appendChild(div); }); }
function renderSheet() { const table = document.getElementById('mini-sheet'); table.innerHTML = ''; appData.sheetData.forEach((row, rIdx) => { const tr = document.createElement('tr'); row.forEach((cell, cIdx) => { const td = document.createElement(rIdx === 0 ? 'th' : 'td'); const input = document.createElement('input'); input.value = cell; input.onchange = (e) => { appData.sheetData[rIdx][cIdx] = e.target.value; saveData(); }; td.appendChild(input); tr.appendChild(td); }); table.appendChild(tr); }); }
function sheetAddRow() { const colCount = appData.sheetData[0].length; appData.sheetData.push(new Array(colCount).fill("")); saveData(); renderSheet(); }
function sheetAddCol() { appData.sheetData.forEach(row => row.push("")); saveData(); renderSheet(); }
function calculateAverage() { let totalScore = 0, totalCredit = 0; const headers = appData.sheetData[0].map(h => h.toLowerCase().trim()); const creditIdx = headers.findIndex(h => h.includes('hệ số')); const scoreIdx = headers.findIndex(h => h.includes('điểm')); if (creditIdx === -1 || scoreIdx === -1) { alert("Bảng cần có cột 'Hệ số' và 'Điểm'!"); return; } for (let i = 1; i < appData.sheetData.length; i++) { const credit = parseFloat(appData.sheetData[i][creditIdx]); const score = parseFloat(appData.sheetData[i][scoreIdx]); if (!isNaN(credit) && !isNaN(score)) { totalScore += (score * credit); totalCredit += credit; } } if (totalCredit > 0) alert(`📊 Điểm trung bình của bạn là: ${(totalScore / totalCredit).toFixed(2)}`); else alert("Không tìm thấy dữ liệu số hợp lệ để tính toán."); }
function updateWheel() { const itemsText = document.getElementById('wheel-items').value; appData.wheelItems = itemsText.split('\n').map(i => i.trim()).filter(i => i); document.getElementById('wheel-items').value = appData.wheelItems.join('\n'); saveData(); drawWheel(); }
let currentDegree = 0;
function drawWheel() { const wheel = document.getElementById('wheel'); wheel.innerHTML = ''; const colors = ['#f44336', '#2196f3', '#ffeb3b', '#4caf50', '#9c27b0', '#ff9800', '#00bcd4', '#e91e63']; const total = appData.wheelItems.length; if (total === 0) { wheel.style.background = 'transparent'; return; } let gradientParts = []; const degreePerItem = 360 / total; for (let i = 0; i < total; i++) { const start = i * degreePerItem; const end = (i + 1) * degreePerItem; gradientParts.push(`${colors[i % colors.length]} ${start}deg ${end}deg`); const midAngle = start + (degreePerItem / 2); const wrapper = document.createElement('div'); wrapper.className = 'wheel-text-wrapper'; let rotateAngle = midAngle - 90; wrapper.style.transform = `rotate(${rotateAngle}deg)`; const textSpan = document.createElement('span'); textSpan.className = 'wheel-text'; textSpan.innerText = appData.wheelItems[i]; let actualRotate = rotateAngle % 360; if (actualRotate < 0) actualRotate += 360; if (actualRotate > 90 && actualRotate < 270) { textSpan.style.display = 'inline-block'; textSpan.style.transform = 'rotate(180deg)'; wrapper.style.justifyContent = 'flex-start'; wrapper.style.paddingLeft = '20px'; wrapper.style.paddingRight = '0'; } wrapper.appendChild(textSpan); wheel.appendChild(wrapper); } wheel.style.background = `conic-gradient(${gradientParts.join(', ')})`; }
function spinWheel() { if(appData.wheelItems.length === 0) return; const btn = document.getElementById('spin-btn'); btn.disabled = true; document.getElementById('wheel-result').innerText = 'Đang quay...'; const extraSpins = (Math.floor(Math.random() * 5) + 5) * 360; const randomDegree = Math.floor(Math.random() * 360); currentDegree += extraSpins + randomDegree; const wheel = document.getElementById('wheel'); wheel.style.transform = `rotate(${currentDegree}deg)`; setTimeout(() => { const actualDegree = currentDegree % 360; const degreePerItem = 360 / appData.wheelItems.length; const index = Math.floor((360 - actualDegree) / degreePerItem) % appData.wheelItems.length; document.getElementById('wheel-result').innerText = `🎉 Kết quả: ${appData.wheelItems[index]}`; btn.disabled = false; }, 4000); }
function addFC() { const q = document.getElementById('fc-q').value.trim(); const a = document.getElementById('fc-a').value.trim(); if(!q || !a) return alert("Vui lòng nhập đủ Câu hỏi và Đáp án!"); appData.flashcards.push({ id: Date.now().toString(), q: q, a: a }); document.getElementById('fc-q').value = ''; document.getElementById('fc-a').value = ''; saveData(); renderFC(); }
function renderFC() { const container = document.getElementById('fc-container'); document.getElementById('fc-count').innerText = appData.flashcards.length; container.innerHTML = ''; if(appData.flashcards.length === 0) { container.innerHTML = '<p style="text-align:center; color:#888; grid-column: 1/-1;">Chưa có thẻ nào. Hãy tạo thẻ đầu tiên!</p>'; return; } appData.flashcards.forEach(fc => { const card = document.createElement('div'); card.className = 'flashcard'; card.onclick = (e) => { if(e.target.tagName !== 'BUTTON') card.classList.toggle('flipped'); }; card.innerHTML = ` <div class="fc-inner"> <div class="fc-front">${fc.q}</div> <div class="fc-back"> <div class="fc-back-text">${fc.a}</div> <div class="fc-actions"> <button onclick="removeFC('${fc.id}', event)" style="background: var(--coral-red);">Đã hiểu</button> <button onclick="keepFC(event)" style="background: #4CAF50;">Nhớ nhớ</button> </div> </div> </div> `; container.appendChild(card); }); }
function removeFC(id, e) { e.stopPropagation(); appData.flashcards = appData.flashcards.filter(f => f.id !== id); saveData(); renderFC(); }
function keepFC(e) { e.stopPropagation(); e.target.closest('.flashcard').classList.remove('flipped'); }
let pomoState = 'idle'; let pomoInterval; let timeRemaining = 0; let totalTime = 0; const CIRCUMFERENCE = 377;
function initPomo() { document.getElementById('pomo-start').onclick = startPomo; document.getElementById('pomo-pause').onclick = pausePomo; document.getElementById('pomo-reset').onclick = resetPomo; document.getElementById('pomo-work-sel').onchange = resetPomo; document.getElementById('pomo-rest-sel').onchange = resetPomo; updatePomoDisplay(parseInt(document.getElementById('pomo-work-sel').value) * 60, 'work'); updatePomoDisplay(parseInt(document.getElementById('pomo-rest-sel').value) * 60, 'rest'); }
function startPomo() { if(pomoState === 'idle') { pomoState = 'work'; totalTime = parseInt(document.getElementById('pomo-work-sel').value) * 60; timeRemaining = totalTime; document.getElementById('box-work').classList.add('active'); document.getElementById('box-rest').classList.remove('active'); } else if (pomoState === 'paused') { pomoState = document.getElementById('box-work').classList.contains('active') ? 'work' : 'rest'; } clearInterval(pomoInterval); pomoInterval = setInterval(pomoTick, 1000); }
function pausePomo() { clearInterval(pomoInterval); pomoState = 'paused'; }
function resetPomo() { clearInterval(pomoInterval); pomoState = 'idle'; document.getElementById('box-work').classList.add('active'); document.getElementById('box-rest').classList.remove('active'); updatePomoDisplay(parseInt(document.getElementById('pomo-work-sel').value) * 60, 'work'); updatePomoDisplay(parseInt(document.getElementById('pomo-rest-sel').value) * 60, 'rest'); document.getElementById('ring-work').style.strokeDashoffset = 0; document.getElementById('ring-rest').style.strokeDashoffset = 0; }
function pomoTick() { timeRemaining--; if(timeRemaining < 0) { if(pomoState === 'work') { pomoState = 'rest'; totalTime = parseInt(document.getElementById('pomo-rest-sel').value) * 60; timeRemaining = totalTime; document.getElementById('box-work').classList.remove('active'); document.getElementById('box-rest').classList.add('active'); document.getElementById('ring-work').style.strokeDashoffset = 0; alert("⏰ Hết giờ học! Hãy nghỉ ngơi nhé!"); } else { pomoState = 'work'; totalTime = parseInt(document.getElementById('pomo-work-sel').value) * 60; timeRemaining = totalTime; document.getElementById('box-work').classList.add('active'); document.getElementById('box-rest').classList.remove('active'); document.getElementById('ring-rest').style.strokeDashoffset = 0; alert("⏰ Hết giờ nghỉ! Quay lại tập trung nào!"); } } updatePomoDisplay(timeRemaining, pomoState); }
function updatePomoDisplay(seconds, type) { const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); document.getElementById(`time-${type}`).innerText = `${m}:${s}`; if(totalTime > 0 && timeRemaining <= totalTime) { const circle = document.getElementById(`ring-${type}`); const offset = CIRCUMFERENCE - (seconds / totalTime) * CIRCUMFERENCE; circle.style.strokeDashoffset = offset; } }

document.getElementById('clear-btn').addEventListener('click', () => { if(confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?')) { localStorage.removeItem('myDashboardData'); location.reload(); } });
/* --- GIỮ NGUYÊN TOÀN BỘ CODE CŨ, BỔ SUNG CÁC LOGIC SAU --- */

// Cập nhật appData để lưu thêm chiều rộng
if (!appData.moduleWidths) appData.moduleWidths = {};

// Trong DOMContentLoaded, thêm gọi hàm initResizing()
document.addEventListener('DOMContentLoaded', () => {
    // ... các lệnh gọi cũ ...
    initResizing(); 
    applySavedWidths();
});

// Hàm áp dụng chiều rộng đã lưu
function applySavedWidths() {
    Object.keys(appData.moduleWidths).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.flex = `0 0 ${appData.moduleWidths[id]}`;
        }
    });
}

function initResizing() {
    const handles = document.querySelectorAll('.resize-handle');
    let currentModule = null;
    let startX, startWidth;

    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            currentModule = handle.parentElement;
            startX = e.clientX;
            startWidth = currentModule.offsetWidth;

            currentModule.setAttribute('draggable', 'false'); // Tạm dừng drag & drop
            currentModule.classList.add('resizing');

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    });

    function handleMouseMove(e) {
        if (!currentModule) return;
        
        // Tính toán chiều rộng mới
        const delta = e.clientX - startX;
        const newWidth = startWidth + delta;
        const containerWidth = document.getElementById('drag-container').offsetWidth;
        
        // Chuyển sang đơn vị % để co giãn tốt hơn trên các màn hình
        const widthPercent = (newWidth / containerWidth) * 100;
        
        // Giới hạn không cho kéo quá nhỏ hoặc quá to
        const finalWidth = Math.min(Math.max(widthPercent, 20), 100);
        
        currentModule.style.flex = `0 0 ${finalWidth}%`;
    }

    function handleMouseUp() {
        if (currentModule) {
            // Lưu chiều rộng vào data
            appData.moduleWidths[currentModule.id] = currentModule.style.flex.split('0 0 ')[1];
            saveData();

            currentModule.setAttribute('draggable', 'true'); // Kích hoạt lại drag & drop
            currentModule.classList.remove('resizing');
            currentModule = null;
        }
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
}
