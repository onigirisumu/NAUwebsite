const adminToken = localStorage.getItem('adminToken');

const dailyChartCtx = document.getElementById('dailyChart');
const serviceChartCtx = document.getElementById('serviceChart');
const hourlyChartCtx = document.getElementById('hourlyChart');
const applyBtn = document.getElementById('applyFilters');

let dailyChart, serviceChart, hourlyChart;

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Authorization': `Bearer ${adminToken}`,
    ...(options.headers || {})
  };
  
  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    alert('Сессия истекла. Требуется повторный вход');
    window.location.href = '/';
    return null;
  }
  
  if (!response.ok) {
    throw new Error(`Ошибка запроса: ${response.status} ${response.statusText}`);
  }
  
  return response;
}

async function loadAnalytics() {
  try {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    const params = new URLSearchParams();
    if (startDate) params.append('start', startDate);
    if (endDate) params.append('end', endDate);
    
    const [dailyData, serviceData, hourlyData] = await Promise.all([
      fetch(`/api/analytics/daily?${params}`).then(res => res.json()),
      fetch(`/api/analytics/services?${params}`).then(res => res.json()),
      fetch(`/api/analytics/hourly?${params}`).then(res => res.json())
    ]);
    
    updateCharts(dailyData, serviceData, hourlyData);
  } catch (error) {
    console.error('Ошибка загрузки аналитики:', error);
    alert(`Ошибка загрузки данных: ${error.message}`);
  }
}

function updateCharts(dailyData, serviceData, hourlyData) {
  if (dailyChart) dailyChart.destroy();
  if (serviceChart) serviceChart.destroy();
  if (hourlyChart) hourlyChart.destroy();
  
  dailyChart = new Chart(dailyChartCtx, {
    type: 'line',
    data: {
      labels: dailyData.map(d => d._id),
      datasets: [{
        label: 'Количество заявок',
        data: dailyData.map(d => d.count),
        borderColor: '#4361ee',
        backgroundColor: 'rgba(67, 97, 238, 0.1)',
        borderWidth: 3,
        tension: 0.2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Динамика заявок по дням'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
  
  serviceChart = new Chart(serviceChartCtx, {
    type: 'doughnut',
    data: {
      labels: serviceData.map(s => s._id || 'Не указана'),
      datasets: [{
        data: serviceData.map(s => s.count),
        backgroundColor: [
          '#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#f72585',
          '#7209b7', '#3a0ca3', '#2ec4b6', '#e71d36', '#ff9f1c'
        ],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right'
        },
        title: {
          display: true,
          text: 'Распределение по услугам'
        }
      }
    }
  });
  
  hourlyChart = new Chart(hourlyChartCtx, {
    type: 'bar',
    data: {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Количество заявок',
        data: Array.from({length: 24}, (_, i) => {
          const hourData = hourlyData.find(h => h._id === i);
          return hourData ? hourData.count : 0;
        }),
        backgroundColor: '#4895ef',
        borderColor: '#3f37c9',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Заявки по времени суток'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('isAdmin') !== 'true') {
    alert('Требуется авторизация администратора');
    window.location.href = '/';
    return;
  }
  
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  document.getElementById('startDate').valueAsDate = oneMonthAgo;
  document.getElementById('endDate').valueAsDate = now;
  
  loadAnalytics();
});


// Применение фильтров
applyBtn.addEventListener('click', loadAnalytics);

// Обновление данных каждые 5 минут
setInterval(loadAnalytics, 5 * 60 * 1000);
