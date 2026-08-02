const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const sequelize = require('../config/database');

const db = {};
// Read all files in the current directory (except index.js)
const modelFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file !== 'index.js' && file.endsWith('.js'));

// Import each model and add to db object
for (const file of modelFiles) {
  const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
  db[model.name] = model;
}

// If any model has an `associate` method, call it with the db object
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Add the sequelize instance and the Sequelize class to the db object
db.sequelize = sequelize;

module.exports = db;