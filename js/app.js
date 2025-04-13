/**
 * Main application logic for Veeva Vault Manager Web
 */

// Global state
const AppState = {
    currentOperation: 'pull',
    crudOperation: 'insert',
    vaultObjects: [],
    availableFields: [],
    inputFileData: null,
    columnMappings: {},
    operationInProgress: false,
    
    // Update the operation
    setOperation(operation) {
        this.currentOperation = operation;
        updateUIForOperation();
    },
    
    // Update the CRUD operation
    setCrudOperation(operation) {
        this.crudOperation = operation;
        updateCrudOperation();
    },
    
    // Set the input file data
    setInputFileData(data) {
        this.inputFileData = data;
    },
    
    // Set the vault objects
    setVaultObjects(objects) {
        this.vaultObjects = objects;
        updateObjectDropdowns();
    },
    
    // Set the available fields
    setAvailableFields(fields) {
        this.availableFields = fields;
    },
    
    // Set a column mapping
    setColumnMapping(fileColumn, vaultField) {
        this.columnMappings[fileColumn] = vaultField;
    },
    
    // Clear all column mappings
    clearColumnMappings() {
        this.columnMappings = {};
    },
    
    // Reset the state
    reset() {
        this.operationInProgress = false;
        UIUtils.updateProgress(0);
        UIUtils.updateStatus('Ready');
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Load saved configuration
    loadSavedConfig();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update UI for initial operation
    updateUIForOperation();
    
    // Initial log message
    Logger.info('Veeva Vault Manager Web initialized');
});

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Operation radio buttons
    document.querySelectorAll('input[name="operation"]').forEach(radio => {
        radio.addEventListener('change', function() {
            AppState.setOperation(this.value);
        });
    });
    
    // CRUD operation radio buttons
    document.querySelectorAll('input[name="crudOperation"]').forEach(radio => {
        radio.addEventListener('change', function() {
            AppState.setCrudOperation(this.value);
        });
    });
    
    // Test connection button
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
    
    // Fetch objects buttons
    document.getElementById('fetchObjectsBtn').addEventListener('click', fetchVaultObjects);
    document.getElementById('fetchObjectsBtn2').addEventListener('click', fetchVaultObjects);
    
    // Object selection
    document.getElementById('pullObjectCombo').addEventListener('change', onObjectSelected);
    document.getElementById('pushObjectCombo').addEventListener('change', onObjectSelected);
    
    // Input file
    document.getElementById('inputFile').addEventListener('change', handleFileUpload);
    
    // Column mapping buttons
    document.getElementById('autoMapBtn').addEventListener('click', autoMapColumns);
    document.getElementById('clearMapBtn').addEventListener('click', clearMappings);
    
    // Execute button
    document.getElementById('executeBtn').addEventListener('click', executeOperation);
    
    // Save configuration button
    document.getElementById('saveConfigBtn').addEventListener('click', saveConfiguration);
    
    // Help button
    document.getElementById('helpBtn').addEventListener('click', () => {
        UIUtils.showModal('helpModal');
    });
    
    // Email settings button
    document.getElementById('emailSettingsBtn').addEventListener('click', () => {
        loadEmailSettings();
        UIUtils.showModal('emailModal');
    });
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            UIUtils.hideModal(modal.id);
        });
    });
    
    // Modal save/cancel buttons
    document.getElementById('saveEmailBtn').addEventListener('click', saveEmailSettings);
    document.getElementById('cancelEmailBtn').addEventListener('click', () => {
        UIUtils.hideModal('emailModal');
    });
    document.getElementById('testEmailBtn').addEventListener('click', testEmailConnection);
    
    // Batch size validation
    document.getElementById('batchSize').addEventListener('input', validateBatchSize);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            UIUtils.hideModal(event.target.id);
        }
    });
}

/**
 * Update UI based on selected operation
 */
function updateUIForOperation() {
    const operation = AppState.currentOperation;
    
    // Hide all configuration sections first
    document.getElementById('pullConfig').classList.add('hidden');
    document.getElementById('pushConfig').classList.add('hidden');
    document.getElementById('metadataConfig').classList.add('hidden');
    document.getElementById('crudOperations').classList.add('hidden');
    document.getElementById('batchSizeSection').classList.add('hidden');
    document.getElementById('mappingSection').style.display = 'none';
    
    // Show relevant sections based on operation
    if (operation === 'pull') {
        document.getElementById('pullConfig').classList.remove('hidden');
    } else if (operation === 'push') {
        document.getElementById('pushConfig').classList.remove('hidden');
        document.getElementById('crudOperations').classList.remove('hidden');
        document.getElementById('batchSizeSection').classList.remove('hidden');
        
        // Show mapping section for non-merge operations
        if (AppState.crudOperation !== 'merge' && AppState.inputFileData) {
            document.getElementById('mappingSection').style.display = 'block';
        }
    } else if (operation === 'metadata') {
        document.getElementById('metadataConfig').classList.remove('hidden');
        
        // Set default metadata filename if empty
        const metadataFileInput = document.getElementById('metadataFile');
        if (!metadataFileInput.value) {
            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            metadataFileInput.value = `veeva_vault_objects_fields_${today}.csv`;
        }
    }
    
    Logger.info(`Operation changed to: ${operation}`);
}

/**
 * Update UI based on selected CRUD operation
 */
function updateCrudOperation() {
    const operation = AppState.crudOperation;
    
    // Update batch size limits
    const batchSizeInput = document.getElementById('batchSize');
    const batchSizeInfo = document.getElementById('batchSizeInfo');
    
    if (operation === 'merge') {
        // Max 10 for merge
        const currentValue = parseInt(batchSizeInput.value);
        batchSizeInput.max = 10;
        batchSizeInput.value = Math.min(currentValue, 10);
        batchSizeInfo.textContent = '(Max batch size: 10 for Merge)';
        
        // Hide mapping section for merge
        document.getElementById('mappingSection').style.display = 'none';
        Logger.info('Merge operation selected. Column mapping not required.');
    } else {
        // Max 500 for other operations
        batchSizeInput.max = 500;
        if (parseInt(batchSizeInput.value) <= 10) {
            batchSizeInput.value = 200; // Reset to default if coming from merge
        }
        batchSizeInfo.textContent = '(Default: 200 for Insert/Update)';
        
        // Show mapping section if we have file data
        if (AppState.inputFileData) {
            document.getElementById('mappingSection').style.display = 'block';
        }
    }
    
    Logger.info(`CRUD operation changed to: ${operation}`);
}

/**
 * Validate batch size input
 */
function validateBatchSize() {
    const batchSizeInput = document.getElementById('batchSize');
    const value = parseInt(batchSizeInput.value);
    
    if (isNaN(value) || value < 1) {
        batchSizeInput.value = 1;
    } else {
        const maxAllowed = AppState.crudOperation === 'merge' ? 10 : 2000;
        if (value > maxAllowed) {
            batchSizeInput.value = maxAllowed;
        }
    }
}

/**
 * Test connection to Veeva Vault
 */
async function testConnection() {
    try {
        // Get connection details
        const apiUrl = document.getElementById('apiUrl').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const verifySSL = document.getElementById('verifySSL').checked;
        
        // Validate inputs
        if (!apiUrl || !username || !password) {
            UIUtils.showNotification('Please provide Veeva Vault API URL, username, and password', 'error');
            return;
        }
        
        // Update UI
        UIUtils.updateStatus('Testing connection...');
        UIUtils.updateProgress(50);
        
        // Initialize API
        VeevaAPI.init(apiUrl, username, password, verifySSL);
        
        // Test connection
        const success = await VeevaAPI.testConnection();
        
        if (success) {
            UIUtils.showNotification('Successfully connected to Veeva Vault', 'success');
            UIUtils.updateStatus('Connected');
            Logger.success('Successfully connected to Veeva Vault');
        } else {
            UIUtils.showNotification('Failed to connect to Veeva Vault. Check your credentials and connection settings.', 'error');
            UIUtils.updateStatus('Connection failed');
            Logger.error('Failed to connect to Veeva Vault');
        }
    } catch (error) {
        UIUtils.showNotification(`Connection test failed: ${error.message}`, 'error');
        UIUtils.updateStatus('Connection failed');
        Logger.error(`Connection test failed: ${error.message}`);
    } finally {
        UIUtils.updateProgress(0);
    }
}

/**
 * Fetch available Vault objects
 */
async function fetchVaultObjects() {
    try {
        // Get connection details
        const apiUrl = document.getElementById('apiUrl').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const verifySSL = document.getElementById('verifySSL').checked;
        
        // Validate inputs
        if (!apiUrl || !username || !password) {
            UIUtils.showNotification('Please provide Veeva Vault API URL, username, and password', 'error');
            return;
        }
        
        // Update UI
        UIUtils.updateStatus('Connecting to Vault...');
        UIUtils.updateProgress(30);
        
        // Initialize API
        VeevaAPI.init(apiUrl, username, password, verifySSL);
        
        // Fetch objects
        const objects = await VeevaAPI.fetchObjects();
        
        // Store objects in state
        AppState.setVaultObjects(objects);
        
        UIUtils.updateStatus('Objects loaded');
        Logger.info(`Loaded ${objects.length} Vault objects`);
    } catch (error) {
        UIUtils.showNotification(`Failed to fetch objects: ${error.message}`, 'error');
        UIUtils.updateStatus('Error');
        Logger.error(`Failed to fetch objects: ${error.message}`);
    } finally {
        UIUtils.updateProgress(0);
    }
}

/**
 * Update object dropdowns with fetched objects
 */
function updateObjectDropdowns() {
    const objects = AppState.vaultObjects;
    
    // Update datalist
    const datalist = document.getElementById('vaultObjects');
    datalist.innerHTML = '';
    
    objects.forEach(obj => {
        const option = document.createElement('option');
        option.value = obj;
        datalist.appendChild(option);
    });
    
    Logger.info('Updated object dropdowns');
}

/**
 * Handle object selection
 */
async function onObjectSelected() {
    const operation = AppState.currentOperation;
    
    // Get selected object
    const selectedObject = operation === 'pull' 
        ? document.getElementById('pullObjectCombo').value 
        : document.getElementById('pushObjectCombo').value;
    
    if (!selectedObject) return;
    
    try {
        // Update UI
        UIUtils.updateStatus('Fetching fields...');
        UIUtils.updateProgress(30);
        
        // Fetch fields for the selected object
        const fields = await VeevaAPI.fetchObjectFields(selectedObject);
        
        // Store fields in state
        AppState.setAvailableFields(fields);
        
        // Set default output filename for pull operation
        if (operation === 'pull') {
            const outputFormat = document.querySelector('input[name="outputFormat"]:checked').value;
            const ext = outputFormat === 'csv' ? '.csv' : '.xlsx';
            document.getElementById('outputFile').value = `${selectedObject}${ext}`;
        }
        
        // Auto-map columns if we have input file data
        if (operation === 'push' && AppState.inputFileData) {
            autoMapColumns();
        }
        
        UIUtils.updateStatus('Fields loaded');
        Logger.info(`Loaded ${fields.length} fields for ${selectedObject}`);
    } catch (error) {
        UIUtils.showNotification(`Failed to fetch fields: ${error.message}`, 'error');
        UIUtils.updateStatus('Error');
        Logger.error(`Failed to fetch fields: ${error.message}`);
    } finally {
        UIUtils.updateProgress(0);
    }
}

/**
 * Handle file upload
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Update UI
        document.getElementById('fileName').textContent = file.name;
        UIUtils.updateStatus('Loading file...');
        UIUtils.updateProgress(30);
        
        // Read file
        const fileData = await FileUtils.readFile(file);
        
        // Store file data in state
        AppState.setInputFileData(fileData);
        
        // Update UI with column mappings if not merge operation
        if (AppState.crudOperation !== 'merge') {
            document.getElementById('mappingSection').style.display = 'block';
            populateMappingTable();
            
            // Auto-map if we have available fields
            if (AppState.availableFields.length > 0) {
                autoMapColumns();
            }
        }
        
        UIUtils.updateStatus('File loaded');
        Logger.info(`Loaded file with ${fileData.columns.length} columns and ${fileData.data.length} rows`);
    } catch (error) {
        UIUtils.showNotification(`Failed to load file: ${error.message}`, 'error');
        UIUtils.updateStatus('Error');
        Logger.error(`Failed to load file: ${error.message}`);
    } finally {
        UIUtils.updateProgress(0);
    }
}

/**
 * Populate the mapping table with file columns
 */
function populateMappingTable() {
    if (!AppState.inputFileData) return;
    
    const { columns, data } = AppState.inputFileData;
    const tbody = document.querySelector('#mappingTable tbody');
    tbody.innerHTML = '';
    
    columns.forEach(column => {
        const row = document.createElement('tr');
        
        // File column
        const colCell = document.createElement('td');
        colCell.textContent = column;
        row.appendChild(colCell);
        
        // Vault field dropdown
        const fieldCell = document.createElement('td');
        const select = document.createElement('select');
        select.className = 'mapping-select';
        select.dataset.column = column;
        
        // Add empty option
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '- Select Field -';
        select.appendChild(emptyOption);
        
        // Add vault fields
        AppState.availableFields.forEach(field => {
            const option = document.createElement('option');
            option.value = field;
            option.textContent = field;
            select.appendChild(option);
        });
        
        // Set value if mapping exists
        if (AppState.columnMappings[column]) {
            select.value = AppState.columnMappings[column];
        }
        
        // Add change event handler
        select.addEventListener('change', function() {
            AppState.setColumnMapping(column, this.value);
        });
        
        fieldCell.appendChild(select);
        row.appendChild(fieldCell);
        
        // Preview data
        const previewCell = document.createElement('td');
        if (data.length > 0) {
            let previewData = data[0][column] || '';
            if (previewData.length > 30) {
                previewData = previewData.substring(0, 27) + '...';
            }
            previewCell.textContent = previewData;
        }
        row.appendChild(previewCell);
        
        tbody.appendChild(row);
    });
}

/**
 * Auto-map columns to vault fields
 */
function autoMapColumns() {
    if (!AppState.inputFileData || !AppState.availableFields.length) {
        UIUtils.showNotification('Please load a file and select a Vault object first', 'info');
        return;
    }
    
    // Reset mappings
    AppState.clearColumnMappings();
    
    const { columns } = AppState.inputFileData;
    const vaultFields = AppState.availableFields;
    
    // Create case-insensitive lookup for vault fields
    const vaultFieldsLower = {};
    vaultFields.forEach(field => {
        vaultFieldsLower[field.toLowerCase()] = field;
    });
    
    // Try to match columns to vault fields
    columns.forEach(column => {
        // Try exact match
        if (vaultFields.includes(column)) {
            AppState.setColumnMapping(column, column);
        }
        // Try case-insensitive match
        else if (vaultFieldsLower[column.toLowerCase()]) {
            AppState.setColumnMapping(column, vaultFieldsLower[column.toLowerCase()]);
        }
        // Try with underscores replaced by spaces and vice versa
        else if (vaultFieldsLower[column.replace('_', ' ').toLowerCase()]) {
            AppState.setColumnMapping(column, vaultFieldsLower[column.replace('_', ' ').toLowerCase()]);
        }
        else if (vaultFieldsLower[column.replace(' ', '_').toLowerCase()]) {
            AppState.setColumnMapping(column, vaultFieldsLower[column.replace(' ', '_').toLowerCase()]);
        }
    });
    
    // Update mapping table
    populateMappingTable();
    
    Logger.info(`Auto-mapped ${Object.keys(AppState.columnMappings).length}/${columns.length} columns`);
}

/**
 * Clear all column mappings
 */
function clearMappings() {
    AppState.clearColumnMappings();
    populateMappingTable();
    Logger.info('Cleared all column mappings');
}

/**
 * Execute the selected operation
 */
async function executeOperation() {
    if (AppState.operationInProgress) {
        return;
    }
    
    AppState.operationInProgress = true;
    
    try {
        const operation = AppState.currentOperation;
        
        // Get connection details
        const apiUrl = document.getElementById('apiUrl').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const verifySSL = document.getElementById('verifySSL').checked;
        
        // Validate common inputs
        if (!apiUrl || !username || !password) {
            UIUtils.showNotification('Please provide Veeva Vault API URL, username, and password', 'error');
            return;
        }
        
        // Initialize API
        VeevaAPI.init(apiUrl, username, password, verifySSL);
        
        // Execute based on operation type
        switch (operation) {
            case 'pull':
                await executePullOperation();
                break;
            case 'push':
                await executePushOperation();
                break;
            case 'metadata':
                await executeMetadataOperation();
                break;
        }
    } catch (error) {
        UIUtils.showNotification(`Operation failed: ${error.message}`, 'error');
        UIUtils.updateStatus('Failed');
        Logger.error(`Operation failed: ${error.message}`);
    } finally {
        AppState.reset();
    }
}

/**
 * Execute pull operation
 */
async function executePullOperation() {
    try {
        Logger.info('Starting pull operation...');
        
        // Get pull-specific inputs
        const selectedObject = document.getElementById('pullObjectCombo').value;
        const outputFile = document.getElementById('outputFile').value;
        const outputFormat = document.querySelector('input[name="outputFormat"]:checked').value;
        
        // Validate inputs
        if (!selectedObject) {
            UIUtils.showNotification('Please select a Veeva Vault object', 'error');
            return;
        }
        
        if (!outputFile) {
            UIUtils.showNotification('Please specify an output file', 'error');
            return;
        }
        
        // Fetch fields for the selected object if not already loaded
        if (AppState.availableFields.length === 0) {
            UIUtils.updateStatus('Fetching metadata...');
            UIUtils.updateProgress(10);
            
            const fields = await VeevaAPI.fetchObjectFields(selectedObject);
            AppState.setAvailableFields(fields);
            
            Logger.info(`Found ${fields.length} fields for ${selectedObject}`);
        }
        
        // Pull data from Vault
        UIUtils.updateStatus('Fetching records...');
        UIUtils.updateProgress(20);
        
        const fields = AppState.availableFields;
        
        const progressCallback = (count) => {
            UIUtils.updateStatus(`Fetched ${count} records...`);
            UIUtils.updateProgress(20 + Math.min(60, count / 10)); // Adjust progress based on record count
        };
        
        const data = await VeevaAPI.pullData(selectedObject, fields, 100, progressCallback);
        
        // Process and save data
        UIUtils.updateStatus('Processing data...');
        UIUtils.updateProgress(90);
        
        let outputData;
        let fileName = outputFile;
        
        // Ensure correct file extension
        if (outputFormat === 'csv' && !fileName.toLowerCase().endsWith('.csv')) {
            fileName += '.csv';
        } else if (outputFormat === 'excel' && !fileName.toLowerCase().endsWith('.xlsx')) {
            fileName += '.xlsx';
        }
        
        if (outputFormat === 'csv') {
            // Convert to CSV
            outputData = FileUtils.dataToCSV(data, fields);
            
            // Download file
            FileUtils.downloadFile(fileName, outputData, 'text/csv;charset=utf-8;');
        } else {
            // Convert to Excel
            const excelBlob = FileUtils.dataToExcel(data, fields);
            
            // Create download link
            const url = URL.createObjectURL(excelBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
        }
        
        // Send email notification if enabled
        if (document.getElementById('emailNotification').checked) {
            const emailSettings = ConfigStorage.loadEmailSettings();
            if (emailSettings) {
                const reportData = {
                    operation: 'pull',
                    subject: `Veeva Vault Data Pull Report: ${selectedObject}`,
                    object: selectedObject,
                    recordCount: data.length,
                    fileName: fileName
                };
                
                await VeevaAPI.sendEmailNotification(emailSettings, reportData);
            }
        }
        
        // Complete
        UIUtils.updateStatus('Completed');
        UIUtils.updateProgress(100);
        
        UIUtils.showNotification(`Successfully exported ${data.length} records to ${fileName}`, 'success');
        Logger.success(`Successfully exported ${data.length} records to ${fileName}`);
    } catch (error) {
        throw error;
    }
}

/**
 * Execute push operation
 */
async function executePushOperation() {
    try {
        Logger.info('Starting push operation...');
        
        // Get push-specific inputs
        const selectedObject = document.getElementById('pushObjectCombo').value;
        const crudOperation = AppState.crudOperation;
        const batchSize = parseInt(document.getElementById('batchSize').value);
        
        // Validate inputs
        if (!selectedObject) {
            UIUtils.showNotification('Please select a target Vault object', 'error');
            return;
        }
        
        if (!AppState.inputFileData) {
            UIUtils.showNotification('Please select an input file', 'error');
            return;
        }
        
        // Only require mapping for non-merge operations
        if (crudOperation !== 'merge' && Object.keys(AppState.columnMappings).length === 0) {
            UIUtils.showNotification('Please map at least one column', 'error');
            return;
        }
        
        UIUtils.updateStatus('Preparing data...');
        UIUtils.updateProgress(10);
        
        // Prepare data based on operation
        let preparedData = [];
        
        if (crudOperation === 'merge') {
            // For merge, use data directly without mapping
            preparedData = AppState.inputFileData.data.map(row => {
                const cleanRow = {};
                Object.keys(row).forEach(key => {
                    cleanRow[key] = row[key] === null ? '' : String(row[key]);
                });
                return cleanRow;
            });
            
            Logger.info('Using direct data for merge operation - no column mapping applied');
        } else {
            // Process with column mapping for other operations
            AppState.inputFileData.data.forEach(row => {
                const mappedRow = {};
                
                Object.keys(AppState.columnMappings).forEach(fileCol => {
                    const vaultField = AppState.columnMappings[fileCol];
                    if (vaultField) {
                        mappedRow[vaultField] = row[fileCol] === null ? '' : String(row[fileCol]);
                    }
                });
                
                preparedData.push(mappedRow);
            });
        }
        
        Logger.info(`Prepared ${preparedData.length} records for upload`);
        
        // Push data to Vault
        UIUtils.updateStatus('Uploading data...');
        UIUtils.updateProgress(20);
        
        const progressCallback = (currentBatch, totalBatches) => {
            const percent = Math.min(90, 20 + (currentBatch / totalBatches * 70));
            UIUtils.updateStatus(`Processing batch ${currentBatch} of ${totalBatches}`);
            UIUtils.updateProgress(percent);
        };
        
        const results = await VeevaAPI.pushData(
            selectedObject,
            preparedData,
            crudOperation,
            batchSize,
            progressCallback
        );
        
        // Send email notification if enabled
        if (document.getElementById('emailNotification').checked) {
            const emailSettings = ConfigStorage.loadEmailSettings();
            if (emailSettings) {
                const reportData = {
                    operation: 'push',
                    subject: `Veeva Vault Data ${crudOperation.charAt(0).toUpperCase() + crudOperation.slice(1)} Report: ${selectedObject}`,
                    object: selectedObject,
                    recordCount: preparedData.length,
                    crudOperation: crudOperation,
                    status: results.success === results.total ? 'Successful' : 'Partially successful',
                    successBatches: results.success,
                    totalBatches: results.total
                };
                
                await VeevaAPI.sendEmailNotification(emailSettings, reportData);
            }
        }
        
        // Complete
        UIUtils.updateStatus('Completed');
        UIUtils.updateProgress(100);
        
        // Report results
        if (results.success === results.total) {
            const message = `${crudOperation.charAt(0).toUpperCase() + crudOperation.slice(1)} operation completed successfully. All ${results.total} batches processed.`;
            UIUtils.showNotification(message, 'success');
            Logger.success(message);
        } else {
            const message = `${crudOperation.charAt(0).toUpperCase() + crudOperation.slice(1)} operation completed with errors. ${results.success} of ${results.total} batches processed successfully.`;
            UIUtils.showNotification(message, 'warning');
            Logger.warning(message);
        }
        
        // Log details
        results.logs.forEach(log => {
            if (log.status === 200) {
                Logger.info(`Batch ${log.batch}: ${log.message}`);
            } else {
                Logger.error(`Batch ${log.batch}: ${log.message}`);
            }
        });
    } catch (error) {
        throw error;
    }
}

/**
 * Execute metadata export operation
 */
async function executeMetadataOperation() {
    try {
        Logger.info('Starting metadata export operation...');
        
        // Get metadata-specific inputs
        const metadataFile = document.getElementById('metadataFile').value;
        
        // Validate inputs
        if (!metadataFile) {
            UIUtils.showNotification('Please specify an output file for the metadata export', 'error');
            return;
        }
        
        UIUtils.updateStatus('Fetching objects...');
        UIUtils.updateProgress(10);
        
        // Ensure filename has .csv extension
        let fileName = metadataFile;
        if (!fileName.toLowerCase().endsWith('.csv')) {
            fileName += '.csv';
        }
        
        // Export metadata
        const progressCallback = (current, total) => {
            const percent = Math.min(90, 10 + (current / total * 80));
            const percentFormatted = (current / total * 100).toFixed(1);
            UIUtils.updateStatus(`Processing object ${current}/${total} (${percentFormatted}%)`);
            UIUtils.updateProgress(percent);
        };
        
        const metadata = await VeevaAPI.exportMetadata(progressCallback);
        
        // Save to CSV
        UIUtils.updateStatus('Saving data...');
        UIUtils.updateProgress(95);
        
        const csvContent = FileUtils.dataToCSV(metadata, ['Object Name', 'Field Name']);
        FileUtils.downloadFile(fileName, csvContent, 'text/csv;charset=utf-8;');
        
        // Send email notification if enabled
        if (document.getElementById('emailNotification').checked) {
            const emailSettings = ConfigStorage.loadEmailSettings();
            if (emailSettings) {
                const reportData = {
                    operation: 'metadata',
                    subject: 'Veeva Vault Objects & Fields Export Report',
                    object: 'All Objects',
                    recordCount: metadata.length,
                    fileName: fileName
                };
                
                await VeevaAPI.sendEmailNotification(emailSettings, reportData);
            }
        }
        
        // Complete
        UIUtils.updateStatus('Completed');
        UIUtils.updateProgress(100);
        
        const objectCount = new Set(metadata.map(item => item['Object Name'])).size;
        UIUtils.showNotification(`Successfully exported ${objectCount} objects with ${metadata.length} fields to ${fileName}`, 'success');
        Logger.success(`Successfully exported ${objectCount} objects with ${metadata.length} fields to ${fileName}`);
    } catch (error) {
        throw error;
    }
}

/**
 * Save current configuration
 */
function saveConfiguration() {
    try {
        const config = {
            connection: {
                apiUrl: document.getElementById('apiUrl').value,
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
                verifySSL: document.getElementById('verifySSL').checked
            },
            lastUsed: {
                operation: AppState.currentOperation,
                crudOperation: AppState.crudOperation,
                outputFile: document.getElementById('outputFile').value,
                outputFormat: document.querySelector('input[name="outputFormat"]:checked').value,
                metadataFile: document.getElementById('metadataFile').value,
                batchSize: document.getElementById('batchSize').value,
                emailNotification: document.getElementById('emailNotification').checked
            }
        };
        
        const success = ConfigStorage.saveConfig(config);
        
        if (success) {
            UIUtils.showNotification('Configuration saved successfully', 'success');
        } else {
            UIUtils.showNotification('Failed to save configuration', 'error');
        }
    } catch (error) {
        UIUtils.showNotification(`Failed to save configuration: ${error.message}`, 'error');
        Logger.error(`Failed to save configuration: ${error.message}`);
    }
}

/**
 * Load saved configuration
 */
function loadSavedConfig() {
    try {
        const config = ConfigStorage.loadConfig();
        if (!config) return;
        
        // Load connection details
        if (config.connection) {
            document.getElementById('apiUrl').value = config.connection.apiUrl || '';
            document.getElementById('username').value = config.connection.username || '';
            document.getElementById('password').value = config.connection.password || '';
            document.getElementById('verifySSL').checked = config.connection.verifySSL !== false;
        }
        
        // Load last used values
        if (config.lastUsed) {
            // Set operation
            if (config.lastUsed.operation) {
                AppState.currentOperation = config.lastUsed.operation;
                document.querySelector(`input[name="operation"][value="${config.lastUsed.operation}"]`).checked = true;
            }
            
            // Set CRUD operation
            if (config.lastUsed.crudOperation) {
                AppState.crudOperation = config.lastUsed.crudOperation;
                document.querySelector(`input[name="crudOperation"][value="${config.lastUsed.crudOperation}"]`).checked = true;
            }
            
            // Set output file
            if (config.lastUsed.outputFile) {
                document.getElementById('outputFile').value = config.lastUsed.outputFile;
            }
            
            // Set output format
            if (config.lastUsed.outputFormat) {
                document.querySelector(`input[name="outputFormat"][value="${config.lastUsed.outputFormat}"]`).checked = true;
            }
            
            // Set metadata file
            if (config.lastUsed.metadataFile) {
                document.getElementById('metadataFile').value = config.lastUsed.metadataFile;
            }
            
            // Set batch size
            if (config.lastUsed.batchSize) {
                document.getElementById('batchSize').value = config.lastUsed.batchSize;
            }
            
            // Set email notification
            if (config.lastUsed.hasOwnProperty('emailNotification')) {
                document.getElementById('emailNotification').checked = config.lastUsed.emailNotification;
            }
        }
        
        // Update UI for operation
        updateUIForOperation();
        updateCrudOperation();
        
        Logger.info('Loaded saved configuration');
    } catch (error) {
        Logger.warning(`Failed to load configuration: ${error.message}`);
    }
}

/**
 * Save email settings
 */
function saveEmailSettings() {
    try {
        const emailSettings = {
            smtpServer: document.getElementById('smtpServer').value,
            senderEmail: document.getElementById('senderEmail').value,
            recipientEmails: document.getElementById('recipientEmails').value,
            ccEmails: document.getElementById('ccEmails').value
        };
        
        const success = ConfigStorage.saveEmailSettings(emailSettings);
        
        if (success) {
            UIUtils.showNotification('Email settings saved', 'success');
            UIUtils.hideModal('emailModal');
        } else {
            UIUtils.showNotification('Failed to save email settings', 'error');
        }
    } catch (error) {
        UIUtils.showNotification(`Failed to save email settings: ${error.message}`, 'error');
        Logger.error(`Failed to save email settings: ${error.message}`);
    }
}

/**
 * Load email settings
 */
function loadEmailSettings() {
    try {
        const emailSettings = ConfigStorage.loadEmailSettings();
        if (!emailSettings) return;
        
        document.getElementById('smtpServer').value = emailSettings.smtpServer || '10.121.0.205';
        document.getElementById('senderEmail').value = emailSettings.senderEmail || '';
        document.getElementById('recipientEmails').value = emailSettings.recipientEmails || '';
        document.getElementById('ccEmails').value = emailSettings.ccEmails || '';
    } catch (error) {
        Logger.warning(`Failed to load email settings: ${error.message}`);
    }
}

/**
 * Test email connection
 */
function testEmailConnection() {
    try {
        const smtpServer = document.getElementById('smtpServer').value;
        const senderEmail = document.getElementById('senderEmail').value;
        
        if (!smtpServer || !senderEmail) {
            UIUtils.showNotification('SMTP server and sender email are required', 'error');
            return;
        }
        
        // In web version, we can only simulate this
        UIUtils.showNotification('SMTP server connection test simulated (not available in web version)', 'info');
    } catch (error) {
        UIUtils.showNotification(`Email test failed: ${error.message}`, 'error');
    }
}