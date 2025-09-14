const config = require('./config');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const validator = require('validator');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const Logger = require('./logger');
const session = require('express-session');
const csurf = require('csurf');
const rateLimit = require("express-rate-limit");
const helmet = require('helmet');
const { title } = require('process');

const app = express();

// EJS setup
app.use(cors());
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public'),
 /*   setHeaders: (res, path, stat) => {
      if (path.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 день для CSS
        } else if (path.endsWith('.js')) {
            res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 час для JS
        } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 год для остального
        }
    }
}*/));

app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware for URL-encoded forms
app.use(bodyParser.urlencoded({ extended: false }));

// Database config
const dbConfig = {
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
};

// Logger initialization
const logger = new Logger({
    logDir: './my-logs',
    level: 'debug'
});

// Environment variables or defaults
const PORT = config.port;
const HOSTNAME = config.HOSTNAME;

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// Apply Helmet
app.use(helmet());

// Rate limiting - increased max for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased max for development
  message: "Слишком много запросов с этого IP, пожалуйста, попробуйте позже через 15 минут."
});

const csrfProtection = csurf({ cookie: false }); // Использует сессию

app.use(csrfProtection);

app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
            "'self'", 
            'https://www.example.com/example.html', 
            'Https://gs.kis.v2.scr.kaspersky-labs.com/2B261B90-DDD6-41A9-ABDB-7DF2890ED537/371727D8-559B-4D96-8D57-6D0C74C51B6D/shutdown/pagehide?tm=2025-09-14T09%A37%A32.877Z'
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        imgSrc: ["'self'", "data:", 'https://yastatic.net'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
    },
}));

// Middleware to pass CSRF token to views
app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// Routes
app.get('/', csrfProtection, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.render('index', { title: 'Главная', csrfToken: req.csrfToken()});
    console.log('web №1 worked');
});

app.get('/contact', (req, res) => {
    res.render('contact', { title: 'Контакты' });
    console.log('web №2 worked');
});

// Route for form submission
app.post('/save-data', limiter, csrfProtection, async (req, res) => {
    try {
        console.log("req.body:", req.body);
        const { Z, Like, COMMENT, dateTime, honeypot } = req.body;

        // Honeypot check
        if (honeypot) {
            console.log("Бот обнаружен!");
            return res.status(400).send("Бот обнаружен.");
        }

        // Validation and sanitization
        const validatedZ = Z ? validator.escape(Z) : null;
        const validatedLike = Like ? validator.escape(Like) : null;
        const validatedCOMMENT = COMMENT ? validator.escape(COMMENT) : null;
        const validatedDateTime = dateTime ? validator.escape(dateTime) : null;

        // Database connection
        const connection = await mysql.createConnection(dbConfig);

        // Prepared query
        const query = `
            INSERT INTO reviews (date_time, liked_website, favorite_section, comment)
            VALUES (?, ?, ?, ?)
        `;

        // Execute query with parameters
        const [rows, fields] = await connection.execute(query, [
            validatedDateTime,
            validatedZ,
            validatedLike,
            validatedCOMMENT
        ]);

        console.log('Data saved to database:', rows);
        await connection.end(); // Close connection

        res.redirect('/thank-you'); // Redirect after successful submission

    } catch (error) {
        console.error('Error saving to database:', error);
        logger.error(`Database error: ${error.message}`);
        res.status(500).redirect('/Server-error'); // Generic error message for the user
    }
});

// Thank you route
app.get('/thank-you', (req, res) => {
    res.render('thank-you', { title: 'Спасибо за ваш отзыв!' });
    setTimeout(res.redirect('/'), 100000);
});

app.get('/Server-error', (req, res) => {
    res.status(500).render('500', {title: "Внутренняя ошибка сервера"})
})

// CSRF error handling
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err)

    // handle CSRF token errors here
    res.status(403)
    res.send('Form tampered with')
});

// Middleware for logging requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Разрешить запросы со всех доменов (не рекомендуется для production)
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Middleware for 404 errors
app.use((req, res, next) => {
    res.status(404).render('404', { title: 'Страница не найдена' });
});

// Function to start the server
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
