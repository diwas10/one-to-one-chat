const SuccessRes = (res: { data?: any, message: string }) => ({...res, success: true});
const ErrorRes = (res: { data?: any, message: string }) => ({...res, success: false});

export {SuccessRes, ErrorRes}