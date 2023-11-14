const express = require ('express');
const routes = require('./routes/routes'); // import the routes
var bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cors());
app.use('/api', routes); //to use the routes
app.listen(3033, () => {
    console.log('Your app is listening on port 3033')
});