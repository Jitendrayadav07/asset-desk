class Response {
  static sendResponse(isSuccess, result, message, statusCode) {
    return {
      isSuccess: !!isSuccess,
      result: result === undefined ? null : result,
      message: message || "",
      statusCode: statusCode || (isSuccess ? 200 : 500),
    };
  }
}

module.exports = Response;
