require('dotenv').config();

const config = {
    db: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_DATABASE || 'myDataBase'
    },
    hostname: process.env.HOSTNAME || 'localhost',
    port: process.env.PORT || 3000,
    sesion: process.env.SESSION_SECRET || 'sesionpassword',
    nodeEnv: process.env.NODE_ENV
};

module.exports = config;