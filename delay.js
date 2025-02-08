export const delay = (ms) => {
    // console.log(`delayed by ${ms}`);
    return new Promise(resolve => setTimeout(resolve, ms));
}
