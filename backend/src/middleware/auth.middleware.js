const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    // 1) Read Authorization header
    const header = req.headers.authorization;

    // header should look like: "Bearer <token>"
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing or invalid Authorization header" });
    }

    // 2) Extract token part
    const token = header.split(" ")[1];

    try {
        // 3) Verify token using secret
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 4) Save user id for next handlers
        req.userId = payload.sub;

        // 5) Continue to the route
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = { requireAuth };
