import express from "express";
import puppeteer from "puppeteer";
import sequelize from "./database.js";
import { compareDbDatas } from "./dbcompares.js";
import { PageData } from "./model.js";
// import { runScrapperForCompanyGeneralDetails } from "./scrapper.js";
import { runScrapperForCompanyGeneralDetails } from "./scrapper.js";

const app = express()
app.use(express.json())

// runScrapperForCompanyGeneralDetails()
compareDbDatas()
app.get('/pages', async (req, res) => {
    const pagesData = await PageData.findAll({ attributes: ['pageNumber'], raw: true })
    const pageNumbers = pagesData.map(pageData => pageData.pageNumber)
    res.send(pageNumbers)
})


sequelize
    .sync()
    .then(() => { app.listen(3000, () => console.log('server running')) })
    .catch((err) => console.log('connection error', err))