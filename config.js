require('dotenv').config();

const config = {
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    },
    hostname: process.env.HOSTNAME || 'localhost',
    port: process.env.PORT || 3000,
    sesion: process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV,
    csrf: process.env.CSURF_TOKEN
};

module.exports = config;