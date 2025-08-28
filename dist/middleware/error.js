export class HttpError extends Error {
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
export function notFound(_req, res) {
    res.status(404).json({ error: 'Not Found' });
}
export function errorHandler(err, _req, res, _next) {
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: err.message, details: err.details });
    }
    // eslint-disable-next-line no-console
    console.error('Unhandled error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
}
