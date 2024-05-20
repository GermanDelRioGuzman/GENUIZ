const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

//middlewares 
app.use(cors());
app.use(bodyParser.json());

app.post('/api/test', (req, res) => {
    res.json({
        greeting: "Hello World!"
    });
});

app.post('/api/customGreeting', (req, res) => {
    const name = req.body.name; 
    res.json({
        greeting: `Hello ${name}!`
    })
})

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`)
})