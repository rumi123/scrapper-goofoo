import express from "express";
import puppeteer from "puppeteer";
import sequelize from "./database.js";
// import { runScrapperForCompanyGeneralDetails } from "./scrapper.js";
import { runScrapperForCompanyGeneralDetails } from "./scrapper.js";

const app = express()

runScrapperForCompanyGeneralDetails()

sequelize
    .sync()
    .then(() => { app.listen(3000, () => console.log('server running')) })
    .catch((err) => console.log('connection error', err))