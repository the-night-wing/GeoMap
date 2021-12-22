const { Pool } = require('pg');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
// app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: '50mb' }));

app.post('/', (req, res) => {
  // console.log('Got body:', req.body);
  updateRow(req.body);
  // console.log(req);
  res.status(200);
});

function updateRow(dataToUpdate) {
  for (let table in dataToUpdate) {
    for (let gid in dataToUpdate[table]) {
      // console.log(dataToUpdate[table][gid].properties);
      const keys = Object.keys(dataToUpdate[table][gid].properties);
      let queryStr = `UPDATE ${table} SET `;
      keys.forEach((key) => {
        const value = dataToUpdate[table][gid].properties[key];
        queryStr += `${key} = ${
          typeof value === 'string'
            ? isNaN(parseFloat(value))
              ? "'" + value + "'"
              : parseFloat(value)
            : value
        }, `;
      });
      queryStr += `geom = ST_GeomFromGeoJSON(${
        "'" + JSON.stringify(dataToUpdate[table][gid].geometry) + "'"
      }) `;
      queryStr += `WHERE gid = ${gid}`;
      console.log(queryStr);
      pool.query(queryStr, (err, res) => {
        console.log(err, res);
      });
      // pool.query(queryStr);
    }

    // pool.query(`UPDATE  SET =${1} WHERE gid=${gid}`);
  }
}

app.get('/:table', (req, res) => {
  console.log('Get request for table ', req.params.table);
  sendQueryToDB(req.params.table, res);
  // console.log(response, 'after promise');
  // res.status('200').send(response);
});

app.listen(4000, () => {
  console.log('listening on 4000');
});

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  port: 5432,
  password: '123',
  database: 'VU-SD-task5'
});
pool.connect();

function sendQueryToDB(table, response) {
  const dbRows = [];

  pool.query(
    `Select *, ST_AsGeoJSON(geom, 5) as geom from ${table}`,
    (err, res) => {
      // console.log(res.rows[0]);
      if (!err) {
        // console.log(res.rows[0].geom);
        // console.log(JSON.parse(res.rows[0].geom).coordinates);
        res.rows.forEach((row) => {
          geomet = JSON.parse(row.geom);
          delete row['geom'];
          const feature = {
            type: 'Feature',
            geometry: geomet,
            properties: row
          };
          dbRows.push(feature);
          // console.log(feature);
        });
        // console.log(dbRows)
        response.status('200').send(dbRows);
        return dbRows;
      } else {
        console.log(err.message);
      }
    }
  );
}
