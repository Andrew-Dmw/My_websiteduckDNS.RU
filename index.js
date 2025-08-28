require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const validator = require('validator');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const Logger = require('./logger');
const session = require('express-session');
const csrf = require('@fastify/csrf-protection');
const rateLimit = require("express-rate-limit");

const app = express();

// Настройки EJS
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware для обработки URL-encoded форм
app.use(bodyParser.urlencoded({ extended: false }));

// Настройки подключения к базе данных
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '2006_Uk0',
    database: 'my_app'
};

// Инициализация логгера
const logger = new Logger({
    logDir: './my-logs',
    level: 'debug'
});

// Переменные окружения или значения по умолчанию
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0"; // Слушает все IP-адреса

// Session configuration
app.use(session({
  secret: 'SunsqSmia6U91~`9',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// CSRF protection
const csrfProtection = csrf({ cookie: false }); // Use session

// Apply CSRF protection after session middleware
app.use(csrfProtection);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: "Слишком много запросов с этого IP, пожалуйста, попробуйте позже через 15 минут."
});

// Middleware to pass CSRF token to views
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
  });

async function initializeCsrf(app) {
  await app.register(csrf, {
    sessionPlugin: 'express-session' // Необходимо указать, что используется express-session
  });
}

initializeCsrf(app)
  .then(() => {
    console.log('CSRF protection initialized.');

// Маршруты
app.get('/', csrfProtection, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.render('index', { title: 'Главная', csrfToken: req.csrfToken()});
    console.log('web №1 worked');
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Контакты' });
    console.log('web №2 worked');
});

// Маршрут для обработки отправки формы
app.post('/save-data', limiter, csrfProtection, async (req, res) => {
    try {
        console.log("req.body:", req.body);
        const { Z, Like, COMMENT, dateTime, honeypot } = req.body;

        // Honeypot check
        if (honeypot) {
            console.log("Бот обнаружен!");
            return res.status(400).send("Бот обнаружен.");
        }

        // Валидация и санитизация данных
        const validatedZ = Z ? validator.escape(Z) : null;
        const validatedLike = Like ? validator.escape(Like) : null;
        const validatedCOMMENT = COMMENT ? validator.escape(COMMENT) : null;
        const validatedDateTime = dateTime ? validator.escape(dateTime) : null;

        // Подключение к базе данных
        const connection = await mysql.createConnection(dbConfig);

        // Подготовленный запрос
        const query = `
            INSERT INTO reviews (date_time, liked_website, favorite_section, comment)
            VALUES (?, ?, ?, ?)
        `;

        // Выполнение запроса с параметрами
        const [rows, fields] = await connection.execute(query, [
            validatedDateTime,
            validatedZ,
            validatedLike,
            validatedCOMMENT
        ]);

        console.log('Данные сохранены в базе данных:', rows);
        // Redirect after successful submission
        res.redirect('/thank-you');

        await connection.end(); // Закрыть соединение
    } catch (error) {
        console.error('Ошибка сохранения в базу данных:', error);
        res.status(500).send('Ошибка сохранения данных.');
        console.error('CSRF validation error:', error);
        res.status(400).send('CSRF validation failed.');
    }
})

// Thank you route
app.get('/thank-you', (req, res) => {
    res.render('thank-you', { title: 'Спасибо за ваш отзыв!' });
});
}).catch(err => {
    console.error('Failed to initialize CSRF protection:', err);
});

app.use(function (err, req, res, next) {
  if (err.message !== 'CSRF validation failed') return next(err)  // Possible change
    // handle CSRF token errors here
    res.status(403)
    res.send('Form tampered with')
})

// Middleware для логирования запросов
app.use((req, res, next) => {
    logger.error(`${req.method} ${req.url}`);
    next();
});

// Middleware для обработки 404 ошибок
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Страница не найдена' });
});

// Функция для запуска сервера
const start = () => {
    try {
        app.listen(PORT, HOSTNAME, () => {
            console.log(`Server started on: http://localhost:${PORT}`);
            console.log(`Process PID: ${process.pid}`);
            logger.info('server start');
        });
    } catch (e) {
        logger.error(`Server error: ${e.message}`);
        logger.error(e.stack);
        console.error(e);
    }
};

start();