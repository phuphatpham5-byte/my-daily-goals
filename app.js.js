// Quotes & Tips
const quotes = [
    "Hành trình vạn dặm bắt đầu từ một bước chân. 🚶‍♂️",
    "Kỷ luật là cầu nối giữa mục tiêu và thành tựu. 🌉",
    "Đừng dừng lại khi mệt mỏi, hãy dừng lại khi xong việc! 💪",
    "Thành công là tổng hòa của những nỗ lực nhỏ lặp đi lặp lại. 🔄",
    "Hôm nay bạn làm gì sẽ quyết định ngày mai của bạn. 🌅"
];

const tips = {
    health: "Tip: Uống một cốc nước ngay khi ngủ dậy nhé! 💧",
    work: "Tip: Áp dụng Pomodoro 25p làm - 5p nghỉ để tối ưu tập trung. ⏱️",
    study: "Tip: Dạy lại kiến thức cho người khác là cách học tốt nhất. 🧠"
};

// Khởi tạo State
let appData = JSON.parse(localStorage.getItem('dailyGoalsData')) || {};
let currentDate = new Date().toISOString().split('T')[0];

// DOM Elements
const datePicker = document.getElementById('date-picker');
const goalInput = document.getElementById('goal-input');
const goalType = document.getElementById('goal-type');
const addBtn = document.getElementById('add-btn');
const goalContainer = document.getElementById('goal-container');

// Khởi tạo
function init() {
    datePicker.value = currentDate;
    renderGoals();
    updateOverallStats();
    
    datePicker.addEventListener('change', (e) => {
        currentDate = e.target.value;
        renderGoals();
    });

    addBtn.addEventListener('click', addGoal);
    goalInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') addGoal(); });
    
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-file').addEventListener('change', importData);
}

// Lưu dữ liệu
function saveData() {
    localStorage.setItem('dailyGoalsData', JSON.stringify(appData));
    updateOverallStats();
}

// Thêm mục tiêu
function addGoal() {
    const title = goalInput.value.trim();
    if (!title) return alert('Vui lòng nhập mục tiêu!');
    
    if (!appData[currentDate]) appData[currentDate] = [];
    
    const newGoal = {
        id: Date.now().toString(),
        title: title,
        type: goalType.value,
        completed: false,
        note: ''
    };
    
    appData[currentDate].push(newGoal);
    goalInput.value = '';
    saveData();
    renderGoals();
}

// Xóa mục tiêu
function deleteGoal(id) {
    if(confirm('Bạn có chắc muốn xóa mục tiêu này?')) {
        appData[currentDate] = appData[currentDate].filter(g => g.id !== id);
        saveData();
        renderGoals();
    }
}

// Cập nhật trạng thái
function toggleGoal(id, isCompleted) {
    const goal = appData[currentDate].find(g => g.id === id);
    if(goal) {
        goal.completed = isCompleted;
        saveData();
        renderGoals(); // Re-render để hiện quote nếu streak
    }
}

// Cập nhật Ghi chú
function updateNote(id, noteContent) {
    const goal = appData[currentDate].find(g => g.id === id);
    if(goal) {
        goal.note = noteContent;
        saveData();
    }
}

// Tính Streak cho 1 mục tiêu cụ thể (dựa vào Tên mục tiêu)
function calculateStreak(goalTitle) {
    let streak = 0;
    let d = new Date(currentDate);
    
    // Check ngày hiện tại
    const todayGoal = appData[currentDate]?.find(g => g.title === goalTitle);
    if(todayGoal && todayGoal.completed) streak++;
    else if(todayGoal && !todayGoal.completed) return 0; // Hôm nay chưa xong thì streak có thể đang tiếp diễn từ hôm qua, nhưng tạm tính streak hiện tại

    // Lùi về các ngày trước
    while (true) {
        d.setDate(d.getDate() - 1);
        const prevDateStr = d.toISOString().split('T')[0];
        if(!appData[prevDateStr]) break;
        
        const prevGoal = appData[prevDateStr].find(g => g.title === goalTitle);
        if(prevGoal && prevGoal.completed) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// Render Giao diện mục tiêu
function renderGoals() {
    goalContainer.innerHTML = '';
    const dailyGoals = appData[currentDate] || [];
    let completedCount = 0;

    if (dailyGoals.length === 0) {
        goalContainer.innerHTML = '<p style="text-align:center; color:#888; grid-column: 1/-1;">Chưa có mục tiêu nào cho ngày này. Hãy thêm mới!</p>';
    }

    dailyGoals.forEach(goal => {
        if(goal.completed) completedCount++;
        const streak = calculateStreak(goal.title);
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        
        const card = document.createElement('div');
        card.className = `card ${goal.completed ? 'completed' : ''}`;
        
        let motivationHTML = '';
        if(goal.completed && streak > 0) {
            motivationHTML = `
                <div class="motivation">
                    <p>🔥 Streak: ${streak} ngày!</p>
                    <p>${randomQuote}</p>
                    <p>${tips[goal.type]}</p>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-header">
                <h3>${goal.title}</h3>
                <input type="checkbox" class="checkbox-custom" ${goal.completed ? 'checked' : ''} 
                       onchange="toggleGoal('${goal.id}', this.checked)">
            </div>
            ${motivationHTML}
            <textarea placeholder="Thêm ghi chú..." onchange="updateNote('${goal.id}', this.value)">${goal.note}</textarea>
            <button class="btn-delete" onclick="deleteGoal('${goal.id}')">Xóa</button>
        `;
        goalContainer.appendChild(card);
    });

    // Update Daily Progress
    const progressPercent = dailyGoals.length === 0 ? 0 : Math.round((completedCount / dailyGoals.length) * 100);
    document.getElementById('daily-progress-text').innerText = `${progressPercent}%`;
    document.getElementById('daily-progress-bar').style.width = `${progressPercent}%`;
}

// Update Thống kê Footer
function updateOverallStats() {
    let totalGoals = 0;
    let totalCompleted = 0;
    let maxStreak = 0;

    // Lấy tháng hiện tại của Date picker
    const currentMonthStr = currentDate.substring(0, 7); // YYYY-MM

    for (const [date, goals] of Object.entries(appData)) {
        // Thống kê tháng
        if(date.startsWith(currentMonthStr)) {
            totalGoals += goals.length;
            totalCompleted += goals.filter(g => g.completed).length;
        }
        
        // Tìm best streak mọi thời đại (Đơn giản hóa: check tất cả các goal)
        goals.forEach(g => {
            const s = calculateStreak(g.title);
            if(s > maxStreak) maxStreak = s;
        });
    }

    const monthPercent = totalGoals === 0 ? 0 : Math.round((totalCompleted / totalGoals) * 100);
    document.getElementById('monthly-progress').innerText = `${monthPercent}%`;
    document.getElementById('best-streak').innerText = `${maxStreak} 🏆`;
    document.getElementById('current-streak-display').innerText = `Best Streak: ${maxStreak} 🔥`;
}

// Export Data
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "daily_goals_backup.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Import Data
function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                appData = importedData;
                saveData();
                renderGoals();
                alert('Import dữ liệu thành công!');
            } catch (err) {
                alert('File không hợp lệ!');
            }
        };
        reader.readAsText(file);
    }
}

// Chạy ứng dụng
document.addEventListener('DOMContentLoaded', init);