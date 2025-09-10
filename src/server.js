import express from "express";
import dotenv from "dotenv";
import router from "./routes.js";
dotenv.config({ path: ".env.local" });

const app = express();
app.use(express.json());
app.use("/", router);

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
