# Veeva Vault Manager Web

A web-based version of the Veeva Vault Manager that can be hosted online, allowing users to interact with Veeva Vault API directly from their browser.

Available on : https://codehopperreddit.github.io/vaultcrmloader/

## Overview

This application allows you to:
- Pull data from Veeva Vault to CSV or Excel files
- Push data from CSV/Excel files to Veeva Vault
- Export metadata (all objects and fields) from Veeva Vault


## Features

### Connection Management
- Configure Veeva Vault API connection
- Test connection functionality
- SSL verification toggle

### Data Operations
- **Pull Operation**: Download data from Veeva Vault objects
- **Push Operation**: Upload data to Veeva Vault with support for:
  - Insert
  - Update
  - Delete
  - Merge (upsert)
- **Metadata Export**: Export all objects and fields information

### Column Mapping
- Automatic column mapping between file and Vault fields
- Manual mapping capability
- Preview data from uploaded files

### Batch Processing
- Configurable batch sizes for optimal performance
- Automatic retry with smaller batch sizes if timeouts occur

### User Interface
- Modern, responsive interface
- Progress indicators
- Detailed logging
- Configuration saving

## Technical Implementation

### CORS Handling

This web version uses a CORS proxy to communicate with the Veeva Vault API:
```javascript
const CORS_PROXY = 'https://cors-anywhere-syse.onrender.com/';
```

This is necessary because browsers enforce the Same-Origin Policy, which prevents direct API calls to different domains. The proxy forwards requests to the Veeva Vault API and returns the responses.

### Local Storage

User configurations are stored in the browser's local storage:
- Connection settings
- Last used operation settings
- Email settings

### File Handling

Since this is a web application:
- Files are downloaded to the browser's default download location
- Input files must be uploaded through the browser's file input
- All processing happens in the browser using JavaScript

### Libraries Used

- **PapaParse**: For CSV parsing and generation
- **SheetJS**: For Excel file handling
- **Font Awesome**: For icons

## Limitations Compared to Desktop Version

1. **Email Notifications**: This web version cannot directly send emails (this would require a backend server)
2. **Security**: Connection credentials are stored in the browser's local storage, which is less secure than the desktop version's configuration file
3. **Processing Power**: Large datasets may be slower to process in the browser compared to the desktop version
4. **Vault Integration**: Uses a CORS proxy for API communication, which adds a layer between the application and Veeva Vault

## Security Considerations

1. The application stores Veeva Vault credentials in browser local storage. This is convenient but less secure than a desktop application.
2. Consider deploying to a private GitHub repository if you're concerned about public access.
3. The CORS proxy is used to facilitate API communication but does not store credentials or data.
4. For a more secure implementation, consider adding a server-side component to handle sensitive operations.

## Usage

1. **Configure Connection**
   - Enter your Veeva Vault API URL, username, and password
   - Test the connection to ensure it works

2. **Select Operation**
   - Choose Pull, Push, or Metadata Export
   - Configure operation-specific settings

3. **Execute Operation**
   - Click the Execute button to perform the selected operation
   - Monitor progress in the status area and logs

4. **Save Configuration**
   - Save your settings for future use with the Save Configuration button

## Troubleshooting

1. **Connection Issues**
   - Try disabling SSL verification if you encounter certificate problems
   - Ensure your Veeva Vault credentials are correct
   - Check if the CORS proxy is operational

2. **Data Issues**
   - For push operations, verify your column mappings
   - For large datasets, try using smaller batch sizes

3. **Download Problems**
   - Ensure your browser allows downloads
   - Check your browser's download settings if files aren't saving properly

## License

This application is provided as-is with no warranty. Use at your own risk.
