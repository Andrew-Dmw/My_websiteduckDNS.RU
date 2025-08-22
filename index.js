require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise'); // Использует mysql2 с Promise API
const validator = require('validator'); // Для валидации данных
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

// Маршруты
app.get('/', (req, res) => {
    res.render('index', { title: 'Главная' });
    console.log('web №1 worked');
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Контакты' });
    console.log('web №2 worked');
});

// Маршрут для обработки отправки формы
app.post('/save-data', async (req, res) => {
    try {
        console.log("req.body:", req.body);
        const { Z, Like, COMMENT, dateTime } = req.body;

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
        res.send('Спасибо за ваш отзыв! Данные сохранены.');

        await connection.end(); // Закрыть соединение
    } catch (error) {
        console.error('Ошибка сохранения в базу данных:', error);
        res.status(500).send('Ошибка сохранения данных.');
    }
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