import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

console.log("DB URL:", process.env.DATABASE_URL);

export const db = mysql.createPool(process.env.DATABASE_URL);
