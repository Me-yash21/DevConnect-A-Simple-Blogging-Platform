import express from 'express';
import cookieParser from 'cookie-parser';
import errorHandler from './middleware/errorHandler.middleware.js';
import upload from './middleware/multer.middleware.js';
import fs from 'fs'

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());


app.use(errorHandler);
export { app }
