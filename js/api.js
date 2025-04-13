/**
 * API handling functions for Veeva Vault Manager Web
 */

// CORS proxy URL for all requests
const CORS_PROXY = 'https://cors-anywhere-syse.onrender.com/';

/**
 * Veeva Vault API client
 */
const VeevaAPI = {
    // Session ID cache
    sessionId: null,
    
    // API URL
    apiUrl: '',
    
    // Credentials
    username: '',
    password: '',
    
    // SSL verification flag
    verifySSL: true,
    
    /**
     * Initialize API with credentials
     * @param {string} apiUrl - Veeva Vault API URL
     * @param {string} username - Username
     * @param {string} password - Password
     * @param {boolean} verifySSL - Whether to verify SSL
     */
    init(apiUrl, username, password, verifySSL = true) {
        this.apiUrl = apiUrl;
        this.username = username;
        this.password = password;
        this.verifySSL = verifySSL;
        this.sessionId = null;
    },
    
    /**
     * Get session ID (authenticate with Veeva Vault)
     * @returns {Promise<string>} - Promise resolving to session ID
     */
    async getSessionId() {
        try {
            // If we already have a session ID, return it
            if (this.sessionId) {
                return this.sessionId;
            }
            
            // Prepare request
            const authUrl = this.apiUrl + '/api/v24.1/auth';
            const formData = new FormData();
            formData.append('username', this.username);
            formData.append('password', this.password);
            
            // Make request through CORS proxy
            const response = await fetch(CORS_PROXY + authUrl, {
                method: 'POST',
                body: formData,
                // Skip SSL verification by using the proxy
                mode: 'cors'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Authentication failed: ${response.status} - ${errorData.message || 'No details available'}`);
            }
            
            const data = await response.json();
            this.sessionId = data.sessionId;
            return this.sessionId;
        } catch (error) {
            Logger.error(`Failed to get session ID: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Get headers for API requests
     * @param {string} sessionId - Session ID
     * @returns {Object} - Headers object
     */
    getHeaders(sessionId) {
        return {
            'Accept': 'application/json',
            'Authorization': `Bearer ${sessionId}`,
            'Content-Type': 'application/json'
        };
    },
    
    /**
     * Test connection to Veeva Vault
     * @returns {Promise<boolean>} - Promise resolving to success status
     */
    async testConnection() {
        try {
            // Try to get a session ID
            await this.getSessionId();
            return true;
        } catch (error) {
            return false;
        }
    },
    
    /**
     * Fetch available objects from Veeva Vault
     * @returns {Promise<Array>} - Promise resolving to array of object names
     */
    async fetchObjects() {
        try {
            const sessionId = await this.getSessionId();
            const headers = this.getHeaders(sessionId);
            
            const url = this.apiUrl + '/api/v24.1/metadata/vobjects';
            
            const response = await fetch(CORS_PROXY + url, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch objects: ${response.status}`);
            }
            
            const data = await response.json();
            return data.objects.map(obj => obj.name).sort();
        } catch (error) {
            Logger.error(`Failed to fetch objects: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Fetch fields for a specific object
     * @param {string} objectName - Name of the object
     * @returns {Promise<Array>} - Promise resolving to array of field names
     */
    async fetchObjectFields(objectName) {
        try {
            const sessionId = await this.getSessionId();
            const headers = this.getHeaders(sessionId);
            
            const url = this.apiUrl + `/api/v24.1/metadata/vobjects/${objectName}`;
            
            const response = await fetch(CORS_PROXY + url, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch fields: ${response.status}`);
            }
            
            const data = await response.json();
            return data.object.fields.map(field => field.name);
        } catch (error) {
            Logger.error(`Failed to fetch fields: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Pull data from Veeva Vault
     * @param {string} objectName - Name of the object to pull
     * @param {Array} fields - Array of field names to include
     * @param {number} batchSize - Number of records per batch
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Array>} - Promise resolving to array of records
     */
    async pullData(objectName, fields, batchSize = 100, progressCallback = null) {
        try {
            const sessionId = await this.getSessionId();
            const headers = this.getHeaders(sessionId);
            
            const fieldsString = fields.join(',');
            let offset = 0;
            let allData = [];
            let moreData = true;
            
            while (moreData) {
                const url = this.apiUrl + `/api/v24.1/vobjects/${objectName}?fields=${fieldsString}&limit=${batchSize}&offset=${offset}`;
                
                try {
                    const response = await fetch(CORS_PROXY + url, {
                        method: 'GET',
                        headers: headers,
                        mode: 'cors'
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Failed to pull data: ${response.status}`);
                    }
                    
                    const batchData = await response.json();
                    const records = batchData.data;
                    
                    if (!records || records.length === 0) {
                        moreData = false;
                    } else {
                        // Clean data by replacing square brackets
                        records.forEach(record => {
                            Object.keys(record).forEach(key => {
                                if (typeof record[key] === 'string') {
                                    record[key] = record[key].replace('[', '').replace(']', '');
                                }
                            });
                        });
                        
                        allData = allData.concat(records);
                        offset += batchSize;
                        
                        // Call progress callback if provided
                        if (progressCallback) {
                            progressCallback(allData.length);
                        }
                    }
                } catch (error) {
                    Logger.warning(`Error fetching batch at offset ${offset}: ${error.message}`);
                    
                    // Try with a smaller batch size
                    const smallerBatchSize = Math.floor(batchSize / 2);
                    if (smallerBatchSize >= 10) {
                        Logger.info(`Retrying with smaller batch size: ${smallerBatchSize}`);
                        
                        const smallerUrl = this.apiUrl + `/api/v24.1/vobjects/${objectName}?fields=${fieldsString}&limit=${smallerBatchSize}&offset=${offset}`;
                        
                        try {
                            const retryResponse = await fetch(CORS_PROXY + smallerUrl, {
                                method: 'GET',
                                headers: headers,
                                mode: 'cors'
                            });
                            
                            if (!retryResponse.ok) {
                                throw new Error(`Failed retry batch: ${retryResponse.status}`);
                            }
                            
                            const retryData = await retryResponse.json();
                            const retryRecords = retryData.data;
                            
                            if (!retryRecords || retryRecords.length === 0) {
                                moreData = false;
                            } else {
                                // Clean data by replacing square brackets
                                retryRecords.forEach(record => {
                                    Object.keys(record).forEach(key => {
                                        if (typeof record[key] === 'string') {
                                            record[key] = record[key].replace('[', '').replace(']', '');
                                        }
                                    });
                                });
                                
                                allData = allData.concat(retryRecords);
                                offset += smallerBatchSize;
                                
                                // Call progress callback if provided
                                if (progressCallback) {
                                    progressCallback(allData.length);
                                }
                                
                                Logger.info(`Recovered and continued with smaller batch size`);
                            }
                        } catch (retryError) {
                            Logger.error(`Failed during retry: ${retryError.message}. Skipping to next batch.`);
                            offset += smallerBatchSize; // Skip this batch
                        }
                    } else {
                        // If we can't reduce batch size further, just skip this batch
                        Logger.error(`Cannot reduce batch size further. Skipping batch at offset ${offset}.`);
                        offset += batchSize;
                    }
                }
            }
            
            return allData;
        } catch (error) {
            Logger.error(`Failed to pull data: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Push data to Veeva Vault
     * @param {string} objectName - Name of the target object
     * @param {Array} data - Array of records to push
     * @param {string} operation - CRUD operation (insert, update, delete, merge)
     * @param {number} batchSize - Number of records per batch
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Object>} - Promise resolving to results object
     */
    async pushData(objectName, data, operation, batchSize = 200, progressCallback = null) {
        try {
            const sessionId = await this.getSessionId();
            const headers = this.getHeaders(sessionId);
            
            // Adjust batch size based on operation
            const actualBatchSize = operation === 'merge' ? Math.min(batchSize, 10) : Math.min(batchSize, 500);
            
            // Prepare batches
            const batches = [];
            for (let i = 0; i < data.length; i += actualBatchSize) {
                batches.push(data.slice(i, i + actualBatchSize));
            }
            
            const results = {
                total: batches.length,
                success: 0,
                failures: 0,
                logs: []
            };
            
            // Process batches
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchJson = JSON.stringify(batch);
                
                try {
                    let url = this.apiUrl + `/api/v24.1/vobjects/${objectName}`;
                    let method = 'POST';
                    
                    // Adjust URL and method based on operation
                    switch (operation) {
                        case 'insert':
                            method = 'POST';
                            break;
                        case 'update':
                            method = 'PUT';
                            break;
                        case 'delete':
                            method = 'DELETE';
                            break;
                        case 'merge':
                            url = this.apiUrl + `/api/v24.1/vobjects/${objectName}/actions/merge`;
                            method = 'POST';
                            break;
                    }
                    
                    const response = await fetch(CORS_PROXY + url, {
                        method: method,
                        headers: headers,
                        body: batchJson,
                        mode: 'cors'
                    });
                    
                    const responseText = await response.text();
                    
                    // Log batch result
                    if (response.ok) {
                        results.success++;
                        results.logs.push({
                            batch: i + 1,
                            status: response.status,
                            message: `Batch ${i + 1} processed successfully`,
                            response: responseText
                        });
                    } else {
                        results.failures++;
                        results.logs.push({
                            batch: i + 1,
                            status: response.status,
                            message: `Batch ${i + 1} failed: ${response.status}`,
                            response: responseText
                        });
                    }
                } catch (error) {
                    results.failures++;
                    results.logs.push({
                        batch: i + 1,
                        status: 'Error',
                        message: `Batch ${i + 1} failed: ${error.message}`,
                        response: error.stack
                    });
                }
                
                // Call progress callback if provided
                if (progressCallback) {
                    progressCallback(i + 1, batches.length);
                }
            }
            
            return results;
        } catch (error) {
            Logger.error(`Failed to push data: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Export metadata (all objects and fields)
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<Array>} - Promise resolving to array of object-field pairs
     */
    async exportMetadata(progressCallback = null) {
        try {
            const sessionId = await this.getSessionId();
            const headers = this.getHeaders(sessionId);
            
            // First, get all objects
            const objectsUrl = this.apiUrl + '/api/v24.1/metadata/vobjects';
            
            const objectsResponse = await fetch(CORS_PROXY + objectsUrl, {
                method: 'GET',
                headers: headers,
                mode: 'cors'
            });
            
            if (!objectsResponse.ok) {
                throw new Error(`Failed to get objects: ${objectsResponse.status}`);
            }
            
            const objectsData = await objectsResponse.json();
            const objects = objectsData.objects.map(obj => obj.name).sort();
            
            // Now get fields for each object
            const results = [];
            const totalObjects = objects.length;
            
            for (let i = 0; i < objects.length; i++) {
                const objectName = objects[i];
                
                try {
                    const fieldsUrl = this.apiUrl + `/api/v24.1/metadata/vobjects/${objectName}`;
                    
                    const fieldsResponse = await fetch(CORS_PROXY + fieldsUrl, {
                        method: 'GET',
                        headers: headers,
                        mode: 'cors'
                    });
                    
                    if (fieldsResponse.ok) {
                        const fieldData = await fieldsResponse.json();
                        
                        if (fieldData.object && fieldData.object.fields) {
                            const fields = fieldData.object.fields.map(field => field.name).sort();
                            
                            // Add each object-field pair to results
                            fields.forEach(fieldName => {
                                results.push({
                                    'Object Name': objectName,
                                    'Field Name': fieldName
                                });
                            });
                            
                            Logger.info(`Added ${fields.length} fields for ${objectName}`);
                        } else {
                            Logger.warning(`No fields found for ${objectName}`);
                        }
                    } else {
                        Logger.error(`Failed to get fields for ${objectName}: ${fieldsResponse.status}`);
                    }
                } catch (error) {
                    Logger.error(`Error processing ${objectName}: ${error.message}`);
                    // Continue with next object
                }
                
                // Call progress callback if provided
                if (progressCallback) {
                    progressCallback(i + 1, totalObjects);
                }
            }
            
            return results;
        } catch (error) {
            Logger.error(`Failed to export metadata: ${error.message}`);
            throw error;
        }
    },
    
    /**
     * Send email notification
     * @param {Object} emailSettings - Email settings
     * @param {Object} reportData - Report data
     * @returns {Promise<boolean>} - Promise resolving to success status
     */
    async sendEmailNotification(emailSettings, reportData) {
        try {
            // For web version, we'll use a simple notification instead of actual email
            // since we can't directly send emails from the browser
            Logger.info('Email notification would be sent with the following details:');
            Logger.info(`SMTP Server: ${emailSettings.smtpServer}`);
            Logger.info(`From: ${emailSettings.senderEmail}`);
            Logger.info(`To: ${emailSettings.recipientEmails}`);
            Logger.info(`CC: ${emailSettings.ccEmails}`);
            Logger.info(`Subject: ${reportData.subject}`);
            Logger.info(`Operation: ${reportData.operation}`);
            Logger.info(`Object: ${reportData.object}`);
            Logger.info(`Records: ${reportData.recordCount}`);
            
            // In a real implementation, you would need a backend service to handle email sending
            UIUtils.showNotification('Email notification would be sent (not available in web version)', 'info');
            
            return true;
        } catch (error) {
            Logger.error(`Failed to send email notification: ${error.message}`);
            return false;
        }
    }
};