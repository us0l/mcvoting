const fs = require('fs');
const path = require('path');

const logFilePath = path.join(__dirname, '../logs/log.txt');

function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

function logError(error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `${timestamp} - ERROR: ${error}\n`;
    fs.appendFile(logFilePath, errorMessage, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

module.exports = {
    log,
    logError,
};