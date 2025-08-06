export class ApiResponse {
    constructor(statusCode, data, message = '', success = true) {
        this.statusCode = statusCode;
        this.data = data || {}; // Ensure data is always an object
        this.message = message;
        this.success = success;
    }
}   
