const jwt = require("jsonwebtoken");

function createToken(userId) {
    return jwt.sign(
        { sub: userId },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
}

module.exports = {
    createToken
};