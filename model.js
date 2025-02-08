import { DataTypes, DATE } from "sequelize";
import sequelize from "./database.js";

export const CompanyGeneralData = sequelize.define('CompanyGeneralData',{
    name:{
        type:DataTypes.STRING,
        allowNull:false
    },
    hall:{
        type:DataTypes.STRING,
        allowNull:false
    },
    stand:{
        type:DataTypes.STRING,
        allowNull:false
    },
    country:{
        type:DataTypes.STRING,
        allowNull:false
    },
    modalurl:{
        type:DataTypes.STRING
    },
    modalData:{
        type:DataTypes.STRING
    },
    pageNumber:{
        type:DataTypes.INTEGER
    },
    brandData:{
        type:DataTypes.JSON
    }
})

export const PageData = sequelize.define('PageData',{
    pageNumber:{
        type:DataTypes.INTEGER
    },
    content:{
        type:DataTypes.STRING
    }
})

export const CompanyProductInfo = sequelize.define('CompanyProductInfo',{
    categories : {
        type:DataTypes.STRING,
    },
    address:{
        type:DataTypes.STRING,
    },
    website:{
        type:DataTypes.STRING
    },
    products:{
        type:DataTypes.STRING
    }
})