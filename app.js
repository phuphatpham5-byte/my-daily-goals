// KHỞI TẠO DỮ LIỆU
let appData = JSON.parse(localStorage.getItem('myDashboardData')) || {
    goals: {}, recall: [], 
    sheetData: [["Môn học", "Hệ số", "Điểm"], ["Toán", "2", "8.5"]],
    wheelItems: ["Ăn phở", "Học code", "Ngủ nướng"], 
    theme: { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' },
    layout: ['module-goals', 'module-habits', 'module-sheets', 'module-wheel', 'module-flashcards', 'module-pomodoro'],
    flashcards: [], habits: [], moduleWidths: {}, moduleHeights: {}
};

// Vá lỗi dữ liệu nếu thiếu
if (!appData.flashcards) appData.flashcards = [];
if (!appData.habits) appData.habits = [];
if (!appData.moduleWidths) appData.moduleWidths = {};
if (!appData.moduleHeights) appData.moduleHeights = {};

let currentDate = new Date().toISOString().split('T')[0];
let tempGoalImg = null, tempFCQImg = null, tempFCAImg = null;

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(); restoreLayout(); initDragAndDrop(); initResizing();
    document.getElementById('date-picker').value = currentDate;
    document.getElementById('date-picker').addEventListener('change', (e) => { currentDate = e.target.value; renderGoals(); });
    document.getElementById('add-btn').addEventListener('click', addGoal);
    document.getElementById('wheel-items').value = appData.wheelItems.join('\n');
    
    renderGoals(); checkActiveRecall(); renderSheet(); updateWheel(); renderFC(); initPomo(); renderHabits();
    
    // Theme Events
    document.getElementById('color-bg').addEventListener('input', updateTheme);
    document.getElementById('color-primary').addEventListener('input', updateTheme);
    document.getElementById('color-text').addEventListener('input', updateTheme);
    document.getElementById('add-fc-btn').addEventListener('click', addFC);

    // Image Upload Events
    setupImageUpload('goal-image-input', 'goal-img-label', (res) => tempGoalImg = res);
    setupImageUpload('fc-q-img', 'fc-q-img-label', (res) => tempFCQImg = res);
    setupImageUpload('fc-a-img', 'fc-a-img-label', (res) => tempFCAImg = res);
});

function saveData() { localStorage.setItem('myDashboardData', JSON.stringify(appData)); }

// XỬ LÝ ẢNH & UPLOAD
function setupImageUpload(inputId, labelId, callback) {
    const input = document.getElementById(inputId);
    input.addEventListener('change', (e) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 400; let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } else { if (h > MAX) { w *= MAX/h; h = MAX; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                callback(canvas.toDataURL('image/jpeg', 0.7));
                document.getElementById(labelId).style.background = 'var(--primary-color)';
            };
            img.src = event.target.result;
        };
        if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    });
}

// ZOOM ẢNH
let currentZoom = 1;
function openImageModal(src, e) {
    if(e) e.stopPropagation();
    document.getElementById('iv-image').src = src;
    document.getElementById('image-viewer-modal').style.display = 'flex';
    currentZoom = 1; applyZoom();
}
function closeImageModal() { document.getElementById('image-viewer-modal').style.display = 'none'; }
function zoomImage(f) { currentZoom = Math.max(0.2, currentZoom + f); applyZoom(); }
function applyZoom() { document.getElementById('iv-image').style.transform = `scale(${currentZoom})`; }

// THEME & RESIZE
function updateTheme() { appData.theme.bg = document.getElementById('color-bg').value; appData.theme.primary = document.getElementById('color-primary').value; appData.theme.text = document.getElementById('color-text').value; applyTheme(); saveData(); }
function applyTheme() { document.documentElement.style.setProperty('--bg-color', appData.theme.bg); document.documentElement.style.setProperty('--primary-color', appData.theme.primary); document.documentElement.style.setProperty('--text-color', appData.theme.text); }
function resetTheme() { appData.theme = { bg: '#1a1a1a', primary: '#00d4ff', text: '#ffffff' }; applyTheme(); saveData(); location.reload(); }

function initResizing() {
    let currentModule = null, startX, startY, startW, startH, mode = '';
    const start = (e, m) => { e.preventDefault(); mode = m; currentModule = e.target.parentElement; startX = e.clientX; startY = e.clientY; startW = currentModule.offsetWidth; startH = currentModule.offsetHeight; currentModule.setAttribute('draggable', 'false'); currentModule.classList.add('resizing'); document.addEventListener('mousemove', move); document.addEventListener('mouseup', stop); };
    document.querySelectorAll('.resize-handle').forEach(h => h.addEventListener('mousedown', e => start(e, 'x')));
    document.querySelectorAll('.resize-handle-y').forEach(h => h.addEventListener('mousedown', e => start(e, 'y')));
    document.querySelectorAll('.resize-handle-corner').forEach(h => h.addEventListener('mousedown', e => start(e, 'both')));
    const move = (e) => {
        if (!currentModule) return;
        if (mode === 'x' || mode === 'both') { const w = Math.min(Math.max((startW + e.clientX - startX) / document.getElementById('drag-container').offsetWidth * 100, 20), 100); currentModule.style.flex = `0 0 ${w}%`; }
        if (mode === 'y' || mode === 'both') { currentModule.style.minHeight = `${Math.max(startH + e.clientY - startY, 150)}px`; }
    };
    const stop = () => { if (currentModule) { appData.moduleWidths[currentModule.id] = currentModule.style.flex.split('0 0 ')[1]; appData.moduleHeights[currentModule.id] = currentModule.style.minHeight; saveData(); currentModule.setAttribute('draggable', 'true'); currentModule.classList.remove('resizing'); currentModule = null; } document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', stop); };
}

function initDragAndDrop() { const container = document.getElementById('drag-container'); document.querySelectorAll('.draggable-module').forEach(m => { m.ondragstart = () => m.classList.add('dragging'); m.ondragend = () => { m.classList.remove('dragging'); appData.layout = [...container.children].map(el => el.id); saveData(); }; }); container.ondragover = e => { e.preventDefault(); const after = ((c, y) => { const els = [...c.querySelectorAll('.draggable-module:not(.dragging)')]; return els.reduce((closest, child) => { const box = child.getBoundingClientRect(); const offset = y - box.top - box.height / 2; return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest; }, { offset: Number.NEGATIVE_INFINITY }).element; })(container, e.clientY); const drag = document.querySelector('.dragging'); if (!after) container.appendChild(drag); else container.insertBefore(drag, after); }; }
function restoreLayout() { const c = document.getElementById('drag-container'); appData.layout.forEach(id => { const el = document.getElementById(id); if(el) c.appendChild(el); }); Object.keys(appData.moduleWidths).forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.flex = `0 0 ${appData.moduleWidths[id]}`; }); Object.keys(appData.moduleHeights).forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.minHeight = appData.moduleHeights[id]; }); }

// GOALS & HABITS
function addGoal() {
    const title = document.getElementById('goal-input').value.trim();
    const end = document.getElementById('end-date-picker').value;
    if (!title && !tempGoalImg) return;
    if (end && end >= currentDate) { appData.habits.push({ id: 'h_'+Date.now(), title: title || "Habit", startDate: currentDate, endDate: end, progressMap: {}, img: tempGoalImg }); }
    else { if (!appData.goals[currentDate]) appData.goals[currentDate] = []; appData.goals[currentDate].push({ id: Date.now().toString(), title: title || "Mục tiêu", completed: false, img: tempGoalImg }); }
    document.getElementById('goal-input').value = ''; tempGoalImg = null; document.getElementById('goal-img-label').style.background = 'rgba(255,255,255,0.1)'; saveData(); renderGoals(); renderHabits();
}

function renderGoals() {
    const c = document.getElementById('goal-container'); const gs = appData.goals[currentDate] || []; c.innerHTML = gs.length ? '' : '<p>Chưa có mục tiêu.</p>';
    gs.forEach(g => {
        const d = document.createElement('div'); d.className = `card ${g.completed ? 'completed' : ''}`;
        const img = g.img ? `<div class="img-wrapper"><img src="${g.img}" class="card-img"><button class="view-img-btn" onclick="openImageModal('${g.img}', event)">🔍</button></div>` : '';
        d.innerHTML = `<div style="display:flex; justify-content:space-between"><h4>${g.title}</h4><input type="checkbox" ${g.completed?'checked':''} onchange="toggleGoal('${g.id}', this.checked)"></div>${img}${g.completed ? `<select onchange="setRecall('${g.id}','${g.title}',this.value);this.value=''"><option value="">+ Ôn tập</option><option value="1">1 ngày</option><option value="3">3 ngày</option><option value="7">7 ngày</option></select>` : ''}`;
        c.appendChild(d);
    });
}
function toggleGoal(id, done) { const g = appData.goals[currentDate].find(x => x.id === id); if(g) g.completed = done; saveData(); renderGoals(); }

function renderHabits() {
    const c = document.getElementById('habit-table'); if(!c || !appData.habits.length) return;
    let minD = appData.habits[0].startDate, maxD = appData.habits[0].endDate;
    appData.habits.forEach(h => { if(h.startDate < minD) minD = h.startDate; if(h.endDate > maxD) maxD = h.endDate; });
    let dates = [], curr = new Date(minD + "T00:00:00"), endD = new Date(maxD + "T00:00:00");
    while(curr <= endD) { dates.push(curr.toISOString().split('T')[0]); curr.setDate(curr.getDate()+1); }
    let htm = `<thead><tr><th class="habit-name-cell">Habits</th>${dates.map(d => `<th>${d.split('-').slice(1).reverse().join('/')}</th>`).join('')}<th>%</th><th>X</th></tr></thead><tbody>`;
    appData.habits.forEach(h => {
        let done = 0, total = 0;
        htm += `<tr><td class="habit-name-cell">${h.title}</td>${dates.map(d => { 
            if(d >= h.startDate && d <= h.endDate) { total++; let ok = h.progressMap[d]; if(ok) done++; return `<td><input type="checkbox" ${ok?'checked':''} onchange="toggleHabit('${h.id}','${d}',this.checked)"></td>`; } return '<td>-</td>';
        }).join('')}<td>${total?Math.round(done/total*100):0}%</td><td><button onclick="delHabit('${h.id}')">🗑</button></td></tr>`;
    });
    c.innerHTML = htm + '</tbody>';
}
function toggleHabit(id, d, ok) { const h = appData.habits.find(x => x.id === id); if(h) h.progressMap[d] = ok; saveData(); renderHabits(); }
function delHabit(id) { if(confirm("Xóa habit?")) { appData.habits = appData.habits.filter(x => x.id !== id); saveData(); renderHabits(); } }

// FLASHCARDS
function addFC() {
    const q = document.getElementById('fc-q').value.trim(), a = document.getElementById('fc-a').value.trim();
    if(!q && !tempFCQImg && !a && !tempFCAImg) return;
    appData.flashcards.push({ id: 'fc_'+Date.now(), q, a, qImg: tempFCQImg, aImg: tempFCAImg });
    document.getElementById('fc-q').value = ''; document.getElementById('fc-a').value = ''; tempFCQImg = null; tempFCAImg = null;
    document.getElementById('fc-q-img-label').style.background = document.getElementById('fc-a-img-label').style.background = 'rgba(255,255,255,0.1)';
    saveData(); renderFC();
}

function renderFC() {
    const c = document.getElementById('fc-container'); document.getElementById('fc-count').innerText = appData.flashcards.length; c.innerHTML = '';
    appData.flashcards.forEach(fc => {
        const d = document.createElement('div'); d.className = 'flashcard';
        // TÍNH NĂNG MỚI: Thêm nút xóa ở mặt trước
        const delBtn = `<button class="fc-delete-btn" onclick="removeFC('${fc.id}', event)" title="Xóa thẻ">🗑</button>`;
        const qImg = fc.qImg ? `<div class="img-wrapper"><img src="${fc.qImg}" class="fc-img"><button class="view-img-btn" onclick="openImageModal('${fc.qImg}', event)">🔍</button></div>` : '';
        const aImg = fc.aImg ? `<div class="img-wrapper"><img src="${fc.aImg}" class="fc-img"><button class="view-img-btn" onclick="openImageModal('${fc.aImg}', event)">🔍</button></div>` : '';
        d.onclick = (e) => { if(e.target.tagName !== 'BUTTON') d.classList.toggle('flipped'); };
        d.innerHTML = `<div class="fc-inner">
            <div class="fc-front">${delBtn}<strong>Q:</strong> ${fc.q} ${qImg}</div>
            <div class="fc-back"><strong>A:</strong> ${fc.a} ${aImg}
                <div class="fc-actions" style="margin-top:10px">
                    <button onclick="removeFC('${fc.id}', event)" style="background:#ff6b6b">Đã hiểu</button>
                    <button onclick="keepFC(event)" style="background:#4CAF50">Ôn lại</button>
                </div>
            </div>
        </div>`;
        c.appendChild(d);
    });
}
function removeFC(id, e) { e.stopPropagation(); if(confirm("Xóa flashcard này?")) { appData.flashcards = appData.flashcards.filter(x => x.id !== id); saveData(); renderFC(); } }
function keepFC(e) { e.stopPropagation(); e.target.closest('.flashcard').classList.remove('flipped'); }

// ACTIVE RECALL
function setRecall(id, title, days) {
    let img = null; Object.values(appData.goals).forEach(l => { let x = l.find(g => g.id === id); if(x && x.img) img = x.img; });
    const d = new Date(); d.setDate(d.getDate() + parseInt(days));
    appData.recall.push({ id: 'r_'+Date.now(), title, dateToReview: d.toISOString().split('T')[0], img });
    saveData(); alert("Đã hẹn lịch!");
}
function checkActiveRecall() {
    const due = appData.recall.filter(r => r.dateToReview <= currentDate);
    const box = document.getElementById('recall-notice'); const list = document.getElementById('recall-list');
    if(due.length) { box.classList.remove('hidden'); list.innerHTML = due.map(r => `<li>${r.title} ${r.img ? `<button onclick="openImageModal('${r.img}')">🖼</button>`:''} <button onclick="remRecall('${r.id}')">Xong</button></li>`).join(''); }
    else box.classList.add('hidden');
}
function remRecall(id) { appData.recall = appData.recall.filter(x => x.id !== id); saveData(); checkActiveRecall(); }

// WHEEL & SHEETS & POMO (LOGIC CŨ)
function renderSheet() { const t = document.getElementById('mini-sheet'); t.innerHTML = ''; appData.sheetData.forEach((row, ri) => { const tr = document.createElement('tr'); row.forEach((val, ci) => { const td = document.createElement(ri===0?'th':'td'); const i = document.createElement('input'); i.value = val; i.onchange = e => { appData.sheetData[ri][ci] = e.target.value; saveData(); }; td.appendChild(i); tr.appendChild(td); }); t.appendChild(tr); }); }
function sheetAddRow() { appData.sheetData.push(new Array(appData.sheetData[0].length).fill("")); renderSheet(); }
function sheetAddCol() { appData.sheetData.forEach(r => r.push("")); renderSheet(); }
function calculateAverage() { let s=0, c=0; const h = appData.sheetData[0].map(x=>x.toLowerCase()); const ci = h.findIndex(x=>x.includes('hệ số')), si = h.findIndex(x=>x.includes('điểm')); if(ci<0||si<0) return; for(let i=1;i<appData.sheetData.length;i++){ const r=appData.sheetData[i], cv=parseFloat(r[ci]), sv=parseFloat(r[si]); if(!isNaN(cv)&&!isNaN(sv)){ s+=cv*sv; c+=cv; } } alert("TB: "+(c?(s/c).toFixed(2):0)); }
function updateWheel() { appData.wheelItems = document.getElementById('wheel-items').value.split('\n').filter(x=>x.trim()); saveData(); drawWheel(); }
let curDeg = 0;
function drawWheel() { const w = document.getElementById('wheel'); w.innerHTML = ''; const clrs = ['#f44336','#2196f3','#ffeb3b','#4caf50','#9c27b0','#ff9800']; const t = appData.wheelItems.length; if(!t) return; let gr = []; const step = 360/t; for(let i=0;i<t;i++){ gr.push(`${clrs[i%clrs.length]} ${i*step}deg ${(i+1)*step}deg`); const mid = i*step+step/2; const wr = document.createElement('div'); wr.className='wheel-text-wrapper'; wr.style.transform=`rotate(${mid-90}deg)`; wr.innerHTML=`<span class="wheel-text">${appData.wheelItems[i]}</span>`; w.appendChild(wr); } w.style.background = `conic-gradient(${gr.join(',')})`; }
function spinWheel() { if(!appData.wheelItems.length) return; curDeg += 1800 + Math.random()*360; document.getElementById('wheel').style.transform = `rotate(${curDeg}deg)`; }

let pState='idle', pRem=0, pInt; const CIRC = 377;
function initPomo() { document.getElementById('pomo-start').onclick = () => { if(pState==='idle'){ pState='work'; pRem=document.getElementById('pomo-work-sel').value*60; } pInt = setInterval(tick,1000); }; document.getElementById('pomo-pause').onclick = () => clearInterval(pInt); document.getElementById('pomo-reset').onclick = () => { clearInterval(pInt); pState='idle'; renderPomo(); }; }
function tick() { pRem--; if(pRem<0){ alert("Hết giờ!"); clearInterval(pInt); pState='idle'; } renderPomo(); }
function renderPomo() { const m = Math.floor(pRem/60), s = pRem%60; document.getElementById('time-work').innerText = `${m}:${s<10?'0':''}${s}`; const off = CIRC - (pRem/(document.getElementById('pomo-work-sel').value*60))*CIRC; document.getElementById('ring-work').style.strokeDashoffset = off; }

document.getElementById('clear-btn').onclick = () => { if(confirm("Xóa hết?")) { localStorage.clear(); location.reload(); } };
