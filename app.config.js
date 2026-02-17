const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:8000/api";

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
