var mysql = require('mysql');
var connection = mysql.createPool({
    connectionLimit:10000,
  host: "64.227.177.68",
  user: 'root',
  password: 'S@urabh@1234$',
  database: 'refral',
  multipleStatements: true
});


module.exports = connection;
