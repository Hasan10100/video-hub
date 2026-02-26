require("dotenv").config();
const app = require("./app");
const { connectDB } = require("./config/db");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const PORT = process.env.BACKEND_PORT;

async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

start();