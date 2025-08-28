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
const helmet = require('helmet');

const app = express();

// EJS setup
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware for URL-encoded forms
app.use(bodyParser.urlencoded({ extended: false }));

// Database config - Still using .env for credentials!
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2006_Uk0',
    database: process.env.DB_DATABASE || 'my_app'
};

// Logger initialization
const logger = new Logger({
    logDir: './my-logs',
    level: 'debug'
});

// Environment variables or defaults
const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'SunsqSmia6U91~`9',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // NOT production
    httpOnly: true,
    sameSite: 'strict' // Keep this even in dev for better security habits
  }
}));

// Apply Helmet - keep it, it's generally good practice
app.use(helmet());

// Rate limiting - maybe relax limits, but don't remove
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased max for development
  message: "Слишком много запросов с этого IP, пожалуйста, попробуйте позже через 15 минут."
});

// CSRF protection initialization
async function initializeCsrf(app) {
    try {
        await app.register(csrf, { sessionPlugin: 'express-session' });
        console.log('CSRF protection initialized.');
    } catch (err) {
        console.error('Failed to initialize CSRF protection:', err);
        // Don't exit in dev, but still log!
        // process.exit(1);
    }
}

// Initialize CSRF protection
initializeCsrf(app).then(() => {

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
            res.status(500).send('Internal Server Error'); // Generic error message for the user
        }
    });

    // Thank you route
    app.get('/thank-you', (req, res) => {
        res.render('thank-you', { title: 'Спасибо за ваш отзыв!' });
    });

    // CSRF error handling
    app.use(function (err, req, res, next) {
        if (err.message !== 'CSRF validation failed') return next(err);
        console.error('CSRF validation error:', err); // Log the error
        res.status(403).send('Form tampered with');
    });

}).catch(err => {
    // Error during CSRF initialization - should be caught by initializeCsrf
});

// Middleware for logging requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
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