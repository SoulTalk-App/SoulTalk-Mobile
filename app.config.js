const PROD_API_URL = "https://soultalkapp.com/api";
const apiBaseUrl = process.env.API_BASE_URL || PROD_API_URL;

const appJson = require("./app.json");

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    apiConfig: {
      baseUrl: apiBaseUrl,
    },
  },
});
