require('dotenv').config();

module.exports = {
  datasource: {
    provider: 'postgresql',
    url: process.env.DATABASE_URL,
  },
};