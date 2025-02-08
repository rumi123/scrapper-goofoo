import { Sequelize } from "sequelize";

var sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './data/companies-new.sqlite',
});

export default sequelize