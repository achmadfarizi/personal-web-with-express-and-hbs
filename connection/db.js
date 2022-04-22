// import postgress pool
const {Pool} = require('pg')

//set up connection pool
const dbPool = new Pool({
    database: 'personal-web',
    port: 5000,
    user: 'postgres',
    password: '123456'
})

//export db pool to be used for query
module.exports = dbPool