const burger = document.getElementById('burger');
const navMenu = document.getElementById('navMenu');
const loginModal = document.getElementById('loginModal');
const loginBtn = document.getElementById('loginBtn');
const closeModal = document.getElementById('closeModal');
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const logoutBtn = document.getElementById('logoutBtn');
const contactForm = document.getElementById('contactForm');
const requestsTable = document.getElementById('requestsTable');

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('isAdmin') === 'true') {
    const analyticsLink = document.getElementById('analyticsLink');
    if (analyticsLink) analyticsLink.style.display = 'block';
    
    loginBtn.textContent = 'Админ';
    
        adminPanel.style.display = 'none';
    loadRequests();
  }
});

burger.addEventListener('click', () => {
  burger.classList.toggle('active');
  navMenu.classList.toggle('active');
});

loginBtn.addEventListener('click', () => {
  loginModal.classList.add('active');
  document.body.style.overflow = 'hidden';
});

closeModal.addEventListener('click', () => {
  loginModal.classList.remove('active');
  document.body.style.overflow = '';
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (username === 'admin' && password === 'admin123') {
    localStorage.setItem('isAdmin', 'true');
  
    const analyticsLink = document.getElementById('analyticsLink');
    if (analyticsLink) analyticsLink.style.display = 'block';
    
    loginModal.classList.remove('active');
    document.body.style.overflow = '';
    adminPanel.style.display = 'block';
    loginBtn.textContent = 'Админ';
    loadRequests();
  } else {
    alert('Неверный логин или пароль!');
  }
});


logoutBtn.addEventListener('click', () => {
  const analyticsLink = document.getElementById('analyticsLink');
  if (analyticsLink) analyticsLink.style.display = 'none';
  
  localStorage.removeItem('isAdmin');
  adminPanel.style.display = 'none';
  loginBtn.textContent = 'Войти';
});

async function loadRequests() {
  try {
    const response = await fetch('/api/users');
    const requests = await response.json();
    
    requestsTable.innerHTML = '';
    
    requests.forEach(request => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${request._id}</td>
        <td>${request.name}</td>
        <td>${request.contact}</td>
        <td>${request.service}</td>
        <td>${new Date(request.date).toLocaleDateString()}</td>
        <td class="actions">
          <button class="btn btn-sm btn-primary">Ответить</button>
          <button class="btn btn-sm btn-danger" data-id="${request._id}">Удалить</button>
        </td>
      `;
      requestsTable.appendChild(row);
    });
    
    document.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (confirm('Вы уверены, что хотите удалить эту заявку?')) {
          await fetch(`/api/users/${id}`, { method: 'DELETE' });
          loadRequests();
        }
      });
    });
  } catch (error) {
    console.error('Ошибка загрузки заявок:', error);
  }
}

contactForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const formData = {
    name: this.name.value,
    contact: this.contact.value,
    service: this.service.value,
    message: this.message.value
  };
  
  try {
    const response = await fetch('/submit-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    if (response.ok) {
      alert(data.message);
      this.reset();
      if (adminPanel.style.display === 'block') {
        loadRequests();
      }
    } else {
      throw new Error(data.error || 'Ошибка при отправке');
    }
  } catch (error) {
    alert(error.message);
  }
});


const fadeElements = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('appear');
    }
  });
}, { threshold: 0.1 });

fadeElements.forEach(element => {
  observer.observe(element);
});


