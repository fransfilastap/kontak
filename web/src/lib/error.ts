export class APIRequestError extends Error {
    constructor (
        message: string,
        public code?: number,
        public info?: string,
        public status?: string) {
        super(message)
        Object.setPrototypeOf(this, APIRequestError.prototype)
        this.name = 'WError'
    }
}