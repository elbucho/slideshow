const express = require('express');
const swaggerUi = require('swagger-ui-express');

const app = express();

app.use(
    '/api/docs',
    express.static('/generated')
);

app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(null, {
        swaggerOptions: {
            url: './openapi.yml'
        }
    })
);

app.use(express.static('/generated'));

app.listen(8080);