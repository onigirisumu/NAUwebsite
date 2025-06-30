require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();
const nodemailer = require('nodemailer');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// Добавим после подключения express и до маршрутов
const adminAuth = (req, res, next) => {
  // Проверка через простую сессию (в реальном проекте используйте JWT)
  if (req.headers.authorization === `Bearer ${process.env.ADMIN_SECRET}`) {
    next();
  } else {
    res.status(401).json({ message: 'Требуется авторизация администратора' });
  }
};

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Mail transporter error:', error);
  } else {
    console.log('Mail server is ready to send messages');
  }
});

// Email template function
const createEmailTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
    .header { background-color: #4361ee; color: white; padding: 10px; border-radius: 5px 5px 0 0; }
    .content { margin: 20px 0; }
    .detail { margin-bottom: 10px; }
    .label { font-weight: bold; color: #555; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Новая заявка на сайте NAU</h2>
    </div>
    <div class="content">
      <div class="detail"><span class="label">Имя:</span> ${data.name}</div>
      <div class="detail"><span class="label">Контакт:</span> ${data.contact}</div>
      <div class="detail"><span class="label">Услуга:</span> ${data.service || 'Не указана'}</div>
      <div class="detail"><span class="label">Сообщение:</span><br>${data.message || 'Нет сообщения'}</div>
      <div class="detail"><span class="label">Дата:</span> ${new Date().toLocaleString()}</div>
    </div>
  </div>
</body>
</html>
`;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB connected to NAU database');
  console.log('MongoDB URI:', process.env.MONGO_URI.replace(/:[^@]+@/, ':*****@'));
  
  // Check collection exists
  const db = mongoose.connection.db;
  return db.listCollections({ name: 'usernames' }).toArray();
})
.then(collections => {
  if (collections.length > 0) {
    console.log(`Using collection: usernames`);
  } else {
    console.log('Collection "usernames" not found. Will be created on first insert.');
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.log('Using URI:', process.env.MONGO_URI.replace(/:[^@]+@/, ':*****@'));
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String, required: true },
  service: { type: String, required: true },
  message: String,
  date: { type: Date, default: Date.now }
}, { collection: 'usernames' });

const User = mongoose.model('User', UserSchema);

app.post('/submit-form', async (req, res) => {
  console.log('Received form submission:', req.body);
  
  try {
    const newUser = new User(req.body);
    await newUser.save();
    
    // Send email notification
    const mailOptions = {
      from: `"NAU Website Bot" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Новая заявка на сайте',
      html: createEmailTemplate(req.body)
    };

    await transporter.sendMail(mailOptions);
    console.log('Notification email sent to admin');
    
    res.status(200).json({ 
      message: 'Заявка успешно отправлена!',
      userId: newUser._id
    });
  } catch (err) {
    console.error('Form submission error:', err);
    
    // Handle email errors separately
    if (err.code === 'EAUTH') {
      console.error('Email authentication failed. Check your credentials.');
    }
    
    res.status(500).json({ 
      message: 'Ошибка при сохранении',
      error: err.message 
    });
  }
});


app.get('/api/users', async (req, res) => {
  console.log('Fetching users...');
  try {
    const users = await User.find().sort({ date: -1 });
    res.json(users);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});
// DELETE endpoint
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Заявка удалена' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Ошибка при удалении' });
  }
});

// Analytics endpoints
app.get('/api/analytics/daily', async (req, res) => {
  try {
    const dailyStats = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(dailyStats);
  } catch (err) {
    console.error('Daily analytics error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.get('/api/analytics/services', async (req, res) => {
  try {
    const serviceStats = await User.aggregate([
      {
        $group: {
          _id: "$service",
          count: { $sum: 1 }
        }
      }
    ]);
    res.json(serviceStats);
  } catch (err) {
    console.error('Service analytics error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.get('/api/analytics/hourly', async (req, res) => {
  try {
    const hourlyStats = await User.aggregate([
      {
        $group: {
          _id: { $hour: "$date" },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    res.json(hourlyStats);
  } catch (err) {
    console.error('Hourly analytics error:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

const history = require('connect-history-api-fallback');
app.use(history()); 

app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nСервер запущен на порту ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API Endpoints:`);
  console.log(`   POST http://localhost:${PORT}/submit-form`);
  console.log(`   GET  http://localhost:${PORT}/api/users`);
});