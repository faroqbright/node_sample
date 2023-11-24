export const makeApiResponce = (message, type, status_code, data ) => {
    let responce = {
        message: message,
        type: type,
        code: status_code,
        data: data ? data : [] 
    }
    return responce;
};