const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
        ),
    transports: [
        new winston.transports.File({ 
            filename: 'osInfoLog.log'
        })
    ]
});

function logOsInfo() {
    const os = require('os');
    const osInfo = {
        platform: os.platform(),
        cpus: os.cpus(),
        architecture: os.arch(),
        cores: os.cpus().length,
        release: os.release(),
    };

    logger.info('OS Info', osInfo);
}

module.exports = logOsInfo();
