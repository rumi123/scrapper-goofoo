import axios from "axios";
import { PageData } from "./model.js";
import { runScrapperForCompanyGeneralDetails } from "./scrapper.js";

export const compareDbDatas = async () => {
    const fetchedData = await axios.get('http://localhost:3001/pages')
    console.log(fetchedData.data);
    const pageNumberArray = fetchedData.data

    const pageSet = new Set(pageNumberArray);
    const missingPages = Array.from({ length: 78 }, (_, i) => i + 1)
        .filter(num => !pageSet.has(num));
    console.log(missingPages);

    const existingData = await PageData.findAll({ attributes: ['pageNumber'], raw: true })
    const existingDBPageNumbers = existingData.map(data => data.pageNumber)
    console.log('exist',existingDBPageNumbers);

    const finalMissingPages = (missingPages.map(num => existingDBPageNumbers.includes(num) ? null : num)).filter(Boolean)
    // console.log(finalMissingPages);

    runScrapperForCompanyGeneralDetails(finalMissingPages)
}