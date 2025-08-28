import jwt from 'jsonwebtoken';
export function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Authorization header' });
    }
    const token = header.substring('Bearer '.length);
    try {
        const secret = process.env.JWT_SECRET || 'please_change_me';
        const decoded = jwt.verify(token, secret);
        const maybe = decoded;
        if (!maybe || typeof maybe !== 'object' || typeof maybe.sub !== 'number' || !maybe.role) {
            return res.status(401).json({ error: 'Invalid token payload' });
        }
        req.user = { sub: maybe.sub, role: maybe.role, name: maybe.name, email: maybe.email };
        return next();
    }
    catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
export function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user)
            return res.status(401).json({ error: 'Unauthenticated' });
        if (!roles.includes(req.user.role))
            return res.status(403).json({ error: 'Forbidden' });
        return next();
    };
}
