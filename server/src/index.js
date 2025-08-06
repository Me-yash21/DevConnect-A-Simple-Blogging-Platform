import { app } from "./app.js";
import connectDB from "./config/db.config.js";
import dotenv from 'dotenv';

dotenv.config({
    path: './.env'
});

connectDB()
    .then(() => {
        const PORT = process.env.PORT || 8080;
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Database connection failed:", error);
    });