const fs = require('fs');
const path = require('path');

// Read the original JSON collection
const collectionPath = path.join(__dirname, 'postman', 'Orion Advisor API.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

// Helper function to sanitize filename
function sanitizeFilename(name) {
    return name.replace(/[\/\\:*?"<>|]/g, '-');
}

// Helper function to convert Postman request to YAML format
function convertRequest(item, order) {
    const request = item.request;
    let yaml = `$kind: http-request\n`;
    yaml += `name: ${item.name}\n`;
    yaml += `method: ${request.method}\n`;
    
    // Handle URL
    if (typeof request.url === 'string') {
        yaml += `url: '${request.url}'\n`;
    } else {
        yaml += `url: '${request.url.raw}'\n`;
    }
    
    yaml += `order: ${order}\n`;
    
    // Handle headers
    if (request.header && request.header.length > 0) {
        yaml += `headers:\n`;
        request.header.forEach(header => {
            yaml += `  - key: ${header.key}\n`;
            yaml += `    value: ${header.value}\n`;
        });
    }
    
    // Handle query parameters
    if (request.url && request.url.query && request.url.query.length > 0) {
        yaml += `queryParams:\n`;
        request.url.query.forEach(param => {
            yaml += `  - key: ${param.key}\n`;
            yaml += `    value: '${param.value}'\n`;
        });
    }
    
    // Handle body
    if (request.body && request.body.mode === 'raw') {
        yaml += `body:\n`;
        yaml += `  type: json\n`;
        yaml += `  content: |-\n`;
        const bodyLines = request.body.raw.split('\n');
        bodyLines.forEach(line => {
            yaml += `    ${line}\n`;
        });
    }
    
    // Handle test scripts
    if (item.event) {
        const testEvent = item.event.find(e => e.listen === 'test');
        if (testEvent && testEvent.script && testEvent.script.exec) {
            yaml += `scripts:\n`;
            yaml += `  - type: afterResponse\n`;
            yaml += `    language: text/javascript\n`;
            yaml += `    code: |-\n`;
            testEvent.script.exec.forEach(line => {
                yaml += `      ${line}\n`;
            });
        }
    }
    
    // Handle description
    if (request.description) {
        yaml += `description: ${request.description}\n`;
    }
    
    return yaml;
}

// Process Portfolio Operations folder
const portfolioFolder = collection.item.find(item => item.name === 'Portfolio Operations');
if (portfolioFolder && portfolioFolder.item) {
    portfolioFolder.item.forEach((request, index) => {
        const order = (index + 1) * 1000;
        const filename = sanitizeFilename(request.name) + '.request.yaml';
        const filepath = path.join(__dirname, 'postman', 'collections', 'Orion Advisor API', 'Portfolio Operations', filename);
        
        const yamlContent = convertRequest(request, order);
        
        // Create directory if it doesn't exist
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filepath, yamlContent);
        console.log(`Created: ${filename}`);
    });
}

console.log('Portfolio Operations requests created successfully!');