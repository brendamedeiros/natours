class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // When a new object is created, and a constructor function is called then that function call is not going to appear in the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
