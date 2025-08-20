require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const Logger = require('./logger');

const app = express();

// Настройки EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('layout', 'layout');

// Инициализация логгера
const logger = new Logger({
    logDir: './my-logs',
    level: 'debug'
});

// Переменные окружения или значения по умолчанию
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0"; // Слушает все IP-адреса

// Маршруты
app.get('/', (req, res) => {
    res.render('index', { title: 'Главная' });
    console.log('web №1 worked');
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Контакты' });
    console.log('web №2 worked');
});

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