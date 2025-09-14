require('dotenv').config({   
    debug: true,  
    encoding: 'latin1'
});

const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    HOSTNAME: process.env.HOSTNAME,
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
    sessionSecret: process.env.SESSION_SECRET
    };

module.exports = config;
