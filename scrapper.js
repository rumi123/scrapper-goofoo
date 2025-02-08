import puppeteer from "puppeteer";
import { delay } from "./delay.js";
import { CompanyGeneralData, PageData } from "./model.js";
import fs from "fs"

const pageLimit = 150;
const browser = await puppeteer.launch();

let i = 1
let attempts = 0
let skippedPages = []

const pageNumbers = await PageData.findAll({
    attributes: ['pageNumber'],
    raw: true
});

const pageNumberArray = pageNumbers.map(row => row.pageNumber);

const scrapCompanyGeneralDataFromPage = async (url, pageNumber) => {
    try {
        console.log(`started page ${pageNumber}`);
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForSelector('.m-exhibitors-list__items', { timeout: 20000 });
        const content = await page.content()

        // Get all exhibitor links first
        const exhibitorLinks = await page.$$('.m-exhibitors-list__items__item__name__link');
        const exhibitorsData = [];

        for (const [index, link] of exhibitorLinks.entries()) {
            // Extract basic exhibitor data
            const exhibitorData = await page.evaluate((el) => ({
                name: el.innerText.trim(),
                modalurl: el.getAttribute('href'),
                hall: el.closest('.m-exhibitors-list__items__item').querySelector('.m-exhibitors-list__items__item__hall')?.innerText.trim(),
                stand: el.closest('.m-exhibitors-list__items__item').querySelector('.m-exhibitors-list__items__item__stand')?.innerText.trim(),
                country: el.closest('.m-exhibitors-list__items__item').querySelector('.m-exhibitors-list__items__item__location')?.innerText.trim(),
            }), link);

            // Click the link to open the modal
            await Promise.all([
                page.waitForSelector('.mfp-content', { timeout: 10000 }), // Wait for modal to appear
                link.click(),
            ]);

            await delay(2000)


            // Extract modal data
            const { htmlContent, brandData } = await page.evaluate(() => {
                const modalContent = document.querySelector('.mfp-content');
                console.log(JSON.stringify(Array.from(modalContent.querySelectorAll('.m-exhibitor-entry__item__header__infos__categories__item')).map(el => el.innerHTML)));
                return {
                    htmlContent: modalContent.outerHTML, brandData: {
                        description: modalContent.querySelector('.m-exhibitor-entry__item__body__description')?.innerText.trim(),
                        website: modalContent.querySelector('.m-exhibitor-entry__item__body__contacts__additional__button__website a')?.href,
                        //     address: modalContent.querySelector('.m-exhibitor-entry__item__body__contacts__address')?.innerText.trim(),
                        // hall: modalContent.querySelector('.m-exhibitor-entry__item__header__infos__stand').innerHTML,
                        socialMedia: JSON.stringify(Array.from(modalContent.querySelectorAll('.m-exhibitor-entry__item__body__contacts__additional__social__item a')).map((a) => a.href)),
                        categories: modalContent.querySelectorAll('.m-exhibitor-entry__item__header__infos__categories__item').length ? JSON.stringify(Array.from(modalContent.querySelectorAll('.m-exhibitor-entry__item__header__infos__categories__item')).map(el => Array.from(el.childNodes)
                            .filter(node => node.nodeType === Node.TEXT_NODE)
                            .map(node => node.textContent.trim())
                            .join(' ')).filter(text => text.length > 0)) : null,
                        products: modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title__link').length ? JSON.stringify(Array.from(modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title__link')).map(el => el.textContent.trim())) : null,
                        // brands: modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title a').length ? Array.from(modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title a')).map(el => el.textContent.trim()) : null
                    }
                }
                return {
                    description: modalContent.querySelector('.m-exhibitor-entry__item__body__description')?.innerText.trim(),
                    website: modalContent.querySelector('.m-exhibitor-entry__item__body__contacts__additional__button__website a')?.href,
                    //     address: modalContent.querySelector('.m-exhibitor-entry__item__body__contacts__address')?.innerText.trim(),
                    //     socialMedia: Array.from(modalContent.querySelectorAll('.m-exhibitor-entry__item__body__contacts__additional__social__item a')).map((a) => a.href),
                    categories: modalContent.querySelectorAll('.m-exhibitor-entry__item__header__infos__categories__item').length ? JSON.stringify(Array.from(modalContent.querySelectorAll('.m-exhibitor-entry__item__header__infos__categories__item')).map(el => el.innerHTML)) : null,
                    products: modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title__link').length ? JSON.stringify(Array.from(modalContent.querySelectorAll('.m-exhibitor-entry__item__header__infos__categories__item')).map(el => el.innerHTML)) : null,
                    brands: modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title').length ? JSON.stringify(Array.from(modalContent.querySelectorAll('.m-libraries-products-list__items__item__header__title')).map(el => el.innerHTML)) : null
                };
            });
            console.log(brandData);
            // Combine exhibitor and modal data
            exhibitorsData.push({
                ...exhibitorData,
                modalData: JSON.stringify(htmlContent),
                pageNumber,
                brandData
            });
            // Close the modal
            await page.waitForSelector('.mfp-close', { timeout: 10000 })
            // await page.click('.mfp-close');
            const closeButton = await page.$('.mfp-close');
            if (closeButton) {
                await closeButton.click();
                await page.waitForSelector('.mfp-content', { hidden: true });
            } else {
                console.warn("Close button not found. Skipping modal close.");
            }
        }

        await page.close();
        return { exhibitorsData, pageData: { pageNumber, content } };
    } catch (error) {
        throw error
    }
};

export const runScrapperForCompanyGeneralDetails = async () => {

    const highestPageNumber = await PageData.max('pageNumber')
    i = highestPageNumber + 1

    while (i <= pageLimit) {
        try {
            if(pageNumberArray.includes(i)){
                i++
                continue
            }
            const url = `https://www.gulfood.com/exhibitor-list?&sortby=title%20asc%2Ctitle%20asc&page=${i}&searchgroup=149E2824-exhibitors`;
            const { exhibitorsData, pageData } = await scrapCompanyGeneralDataFromPage(url, i);

            if (exhibitorsData?.length) {
                await CompanyGeneralData.bulkCreate(exhibitorsData);
                await PageData.create(pageData);
            }

            console.log(`Page ${i} completed: ${exhibitorsData?.length || 0} exhibitors`);
            await delay(3000);
            i++;
            attempts = 0
        } catch (error) {
            console.error(`Error on page ${i}:`, error);
            if (attempts === 2) {
                skippedPages.push(i)
                console.log(`attempted page ${i} 2 times skipping to page ${i + 1}`)
                i++
            } else {
                await CompanyGeneralData.destroy({ where: { pageNumber: i } });
                await PageData.destroy({ where: { pageNumber: i } });

                console.log(`Retrying page ${i} after 10 seconds...`);
            }
            attempts++
            await delay(10000);
        }
    }

    if (i === 150) {
        // const pageNumbers = await PageData.findAll({
        //     attributes: ['pageNumber'],
        //     raw: true
        // });

        // const pageNumberArray = pageNumbers.map(row => row.pageNumber);
        const pageSet = new Set(pageNumberArray);
        const missingPages = Array.from({ length: pageLimit }, (_, i) => i + 1)
            .filter(num => !pageSet.has(num));
        console.log(missingPages);
        while (missingPages.length === 0) {
            try {
                if(pageNumberArray.includes(i)){
                    i++
                    continue
                }
                const url = `https://www.gulfood.com/exhibitor-list?&sortby=title%20asc%2Ctitle%20asc&page=${i}&searchgroup=149E2824-exhibitors`;
                const { exhibitorsData, pageData } = await scrapCompanyGeneralDataFromPage(url, i);

                if (exhibitorsData?.length) {
                    await CompanyGeneralData.bulkCreate(exhibitorsData);
                    await PageData.create(pageData);
                }

                console.log(`Page ${i} completed: ${exhibitorsData?.length || 0} exhibitors`);
                await delay(3000);
                i++;
                attempts = 0
            } catch (error) {
                console.error(`Error on page ${i}:`, error);
                if (attempts === 2) {
                    skippedPages.push(i)
                    console.log(`attempted page ${i} 2 times skipping to page ${i + 1}`)
                    i++
                    attempts = 0
                } else {
                    await CompanyGeneralData.destroy({ where: { pageNumber: i } });
                    await PageData.destroy({ where: { pageNumber: i } });

                    console.log(`Retrying page ${i} after 10 seconds...`);
                }
                attempts++
                await delay(10000);
            }
        }
    }
    await browser.close();
};