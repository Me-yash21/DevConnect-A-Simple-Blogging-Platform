class ApiError extends Error{
    constructor(
        statusCode,
        message = "something went wrong",
        errors = [],
        stack = "",
        details =""

    ){
        super(message)
        this.message = message
        this.data = null
        this.statusCode = statusCode
        this.errors = errors
        this.success = false
        this.details = details
        
        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }

    }
}

export {ApiError};