/**
 * Utility functions for Veeva Vault Manager Web
 */

// Constants
const STORAGE_KEY = 'veeva_vault_manager_config';
const EMAIL_STORAGE_KEY = 'veeva_vault_manager_email';

// Log levels
const LOG_LEVELS = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error'
};

/**
 * Logger utility
 */
const Logger = {
    /**
     * Log a message with timestamp and level
     * @param {string} message - Message to log
     * @param {string} level - Log level (info, success, warning, error)
     */
    log(message, level = LOG_LEVELS.INFO) {
        const logContainer = document.getElementById('logContainer');
        if (!logContainer) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${level}`;
        logEntry.textContent = `${timestamp} - ${level.toUpperCase()} - ${message}`;
        
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
        
        // Also log to console for debugging
        console.log(`${timestamp} - ${level.toUpperCase()} - ${message}`);
    },
    
    info(message) {
        this.log(message, LOG_LEVELS.INFO);
    },
    
    success(message) {
        this.log(message, LOG_LEVELS.SUCCESS);
    },
    
    warning(message) {
        this.log(message, LOG_LEVELS.WARNING);
    },
    
    error(message) {
        this.log(message, LOG_LEVELS.ERROR);
    },
    
    /**
     * Clear the log container
     */
    clear() {
        const logContainer = document.getElementById('logContainer');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }
};

/**
 * Configuration storage utility
 */
const ConfigStorage = {
    /**
     * Save configuration to local storage
     * @param {Object} config - Configuration object to save
     */
    saveConfig(config) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
            Logger.info('Configuration saved successfully');
            return true;
        } catch (error) {
            Logger.error(`Failed to save configuration: ${error.message}`);
            return false;
        }
    },
    
    /**
     * Load configuration from local storage
     * @returns {Object|null} - Configuration object or null if not found
     */
    loadConfig() {
        try {
            const storedConfig = localStorage.getItem(STORAGE_KEY);
            return storedConfig ? JSON.parse(storedConfig) : null;
        } catch (error) {
            Logger.error(`Failed to load configuration: ${error.message}`);
            return null;
        }
    },
    
    /**
     * Save email settings to local storage
     * @param {Object} emailSettings - Email settings object
     */
    saveEmailSettings(emailSettings) {
        try {
            localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(emailSettings));
            return true;
        } catch (error) {
            Logger.error(`Failed to save email settings: ${error.message}`);
            return false;
        }
    },
    
    /**
     * Load email settings from local storage
     * @returns {Object|null} - Email settings object or null if not found
     */
    loadEmailSettings() {
        try {
            const storedSettings = localStorage.getItem(EMAIL_STORAGE_KEY);
            return storedSettings ? JSON.parse(storedSettings) : null;
        } catch (error) {
            Logger.error(`Failed to load email settings: ${error.message}`);
            return null;
        }
    }
};

/**
 * UI utility functions
 */
const UIUtils = {
    /**
     * Show a modal dialog
     * @param {string} modalId - ID of the modal to show
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    },
    
    /**
     * Hide a modal dialog
     * @param {string} modalId - ID of the modal to hide
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Update progress bar
     * @param {number} percent - Percentage complete (0-100)
     */
    updateProgress(percent) {
        const progressFill = document.querySelector('.progress-fill');
        const statusLabel = document.getElementById('statusLabel');
        
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        
        if (statusLabel && percent === 100) {
            statusLabel.textContent = 'Completed';
        } else if (statusLabel && percent === 0) {
            statusLabel.textContent = 'Ready';
        }
    },
    
    /**
     * Show a notification to the user
     * @param {string} message - Message to display
     * @param {string} type - Type of notification (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        alert(`${type.toUpperCase()}: ${message}`);
    },
    
    /**
     * Update the status label
     * @param {string} status - Status text to display
     */
    updateStatus(status) {
        const statusLabel = document.getElementById('statusLabel');
        if (statusLabel) {
            statusLabel.textContent = status;
        }
    },
    
    /**
     * Toggle visibility of an element
     * @param {string} elementId - ID of the element to toggle
     * @param {boolean} show - Whether to show or hide the element
     */
    toggleElement(elementId, show) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    },
    
    /**
     * Toggle a class on an element
     * @param {string} elementId - ID of the element
     * @param {string} className - Class to toggle
     * @param {boolean} add - Whether to add or remove the class
     */
    toggleClass(elementId, className, add) {
        const element = document.getElementById(elementId);
        if (element) {
            if (add) {
                element.classList.add(className);
            } else {
                element.classList.remove(className);
            }
        }
    }
};

/**
 * File handling utility functions
 */
const FileUtils = {
    /**
     * Read a CSV or Excel file
     * @param {File} file - File to read
     * @returns {Promise<Object>} - Promise resolving to {data, columns}
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const extension = file.name.split('.').pop().toLowerCase();
                    let data = [];
                    let columns = [];
                    
                    if (extension === 'csv') {
                        // Parse CSV using PapaParse
                        const parseResult = Papa.parse(event.target.result, {
                            header: true,
                            dynamicTyping: false, // Keep everything as strings
                            skipEmptyLines: true
                        });
                        
                        data = parseResult.data;
                        columns = parseResult.meta.fields;
                    } else if (extension === 'xlsx' || extension === 'xls') {
                        // Parse Excel using SheetJS
                        const workbook = XLSX.read(event.target.result, {
                            type: 'binary',
                            cellDates: true
                        });
                        
                        // Use the first sheet
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // Convert to JSON with headers
                        data = XLSX.utils.sheet_to_json(worksheet, {
                            header: 1,
                            raw: false // Convert everything to strings
                        });
                        
                        // Extract headers and data
                        columns = data[0];
                        
                        // Convert array data to objects with headers as keys
                        const objData = [];
                        for (let i = 1; i < data.length; i++) {
                            const rowObject = {};
                            for (let j = 0; j < columns.length; j++) {
                                rowObject[columns[j]] = data[i][j] === undefined ? '' : String(data[i][j]);
                            }
                            objData.push(rowObject);
                        }
                        
                        data = objData;
                    }
                    
                    resolve({ data, columns });
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            
            // Read the file based on extension
            const extension = file.name.split('.').pop().toLowerCase();
            if (extension === 'csv') {
                reader.readAsText(file);
            } else if (extension === 'xlsx' || extension === 'xls') {
                reader.readAsBinaryString(file);
            } else {
                reject(new Error('Unsupported file format'));
            }
        });
    },
    
    /**
     * Download data as a file
     * @param {string} filename - Name of the file to download
     * @param {string} content - File content
     * @param {string} type - MIME type of the file
     */
    downloadFile(filename, content, type = 'text/csv;charset=utf-8;') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = filename;
        
        // Append to the document temporarily
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Clean up
        document.body.removeChild(downloadLink);
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    },
    
    /**
     * Convert data to CSV format
     * @param {Array} data - Array of objects to convert
     * @param {Array} columns - Array of column names
     * @returns {string} - CSV content
     */
    dataToCSV(data, columns) {
        const csv = Papa.unparse({
            fields: columns,
            data: data
        });
        
        return csv;
    },
    
    /**
     * Convert data to Excel format
     * @param {Array} data - Array of objects to convert
     * @param {Array} columns - Array of column names
     * @returns {Blob} - Excel file as blob
     */
    dataToExcel(data, columns) {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Convert data to worksheet
        const wsData = data.map(row => {
            const rowData = [];
            columns.forEach(col => {
                rowData.push(row[col] || '');
            });
            return rowData;
        });
        
        // Add header row
        wsData.unshift(columns);
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        
        return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    }
};