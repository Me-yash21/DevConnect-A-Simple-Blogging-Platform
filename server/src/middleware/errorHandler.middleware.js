const errorHandler = (err, req, res, next) => {

    const statusCode = err.statusCode || 500;

    //Standard error response 
    const errorResponse = {
        success:false,
        error:{
            statusCode ,
            message : err.message || "an unexpected error occured",
            ...(process.env.NODE_ENV === "development" && {stack:err.stack})
        }
    }

    console.error(err.stack);

    //send error response
    return res.status(statusCode).json(errorResponse);
}

export default errorHandler;