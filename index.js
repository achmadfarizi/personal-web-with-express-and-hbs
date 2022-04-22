//pemanggilan package express
const express = require('express');
const hbs = require('hbs');

//import package bcrypt
const bcrypt = require('bcrypt')

//import package express-flash and express-session
const flash = require('express-flash')
const session = require('express-session')

//import db connect
const db = require('./connection/db');

//import uploadFile middleware
const upload = require('./middlewares/uploadfile')

//use package express
const app = express()

//set up template engine
app.set('view engine','hbs')

app.use('/public', express.static(__dirname + '/public'))
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use(express.urlencoded({ extended: false}))
hbs.registerPartials(__dirname + '/views/partials');

//use express flash
app.use(flash())

//setup or create session middleware
app.use(
    session({
        cookie:{
            maxAge: 1000 * 60 * 60 * 2,
            secure: false,
            httpOnly: true,
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret:"secretValue"
    })
)

//kondisi hard code sementara/statis terlebih dahulu
//const isLogin = true

//array manipulation
//const blogs = [
//    {
//        projectName: "Card title",
//        postedAt: "1 bulan",
//        description: "This is a longer card with supporting text below as a natural lead-in to additional content. This content is a little bit longer."
//    }
//]

let month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
]


//create endpoint
app.get('/', (req, res)=>{
    res.render('index')
})

//create endpoint home
app.get('/home', (req, res)=>{

    let query
    if(req.session.isLogin){
        query = `SELECT name1, author_id, tb_project.id, name, start_date, end_date, description, technologies, image
                        FROM tb_project
                        LEFT JOIN tb_user
                        ON tb_user.id = tb_project.author_id
                        WHERE author_id=${req.session.user.id}
                        ORDER BY id DESC`
    }else{
        query = `SELECT name1, author_id, tb_project.id, name, start_date, end_date, description, technologies, image
                        FROM tb_project
                        LEFT JOIN tb_user
                        ON tb_user.id = tb_project.author_id
                        ORDER BY id DESC`
    }

    db.connect(function(err, client, done){
        if (err) throw err

        client.query(query, function(err, result){
            done()

            if (err) throw err
            let data = result.rows

            //console.log(data);

            data = data.map((blog) =>{
                return{
                    ...blog,
                    post_at: getDistanceTime(blog.start_date, blog.end_date),
                    isLogin: req.session.isLogin
                }
            })

            res.render('index', {
                isLogin: req.session.isLogin,
                user: req.session.user,
                blogs: data
            })
        })
    })
})

app.post('/home',upload.single('image'),(req, res)=>{
    let projectName = req.body.projectName
    let startDate = req.body.startDate
    let endDate = req.body.endDate
    let description = req.body.description
    let checkbox = req.body.checkskill

    if (projectName == '' || startDate == '' || endDate == '' || description == '' || checkbox == '') {
        req.flash('error', 'Please insert all field!');
        return res.redirect('/add-project');
    }

    //console.log(checkbox)
    
    let blog ={
        projectName,
        startDate,
        endDate,
        description,
        checkbox,
        image: req.file.filename,
        author_id: req.session.user.id
    }
    //console.log(blog);

    //let blog = req.body

    db.connect((err, client, done)=>{

        queery = `INSERT INTO tb_project(name, start_date, end_date, description, technologies, image, author_id) VALUES
                ('${blog.projectName}', '${blog.startDate}', '${blog.endDate}', '${blog.description}', '{${blog.checkbox}}','${blog.image}','${blog.author_id}')`

        if (err) throw err

        client.query(queery, (err, result)=>{
            done()
            if (err) throw err

            res.redirect('/home')
        })
    })
    //blogs.push(blog)
    //console.log(blogs)

    //res.redirect('/home')
})

//create endpoint add project
app.get('/add-project', (req, res)=>{

    if (!req.session.isLogin){
        res.redirect('/home')
    }
    res.render('addproject', {
        isLogin: req.session.isLogin, 
        user: req.session.user
    })
})

//create endpoint project detail with id
app.get('/home/:id', (req, res)=>{
    let id = req.params.id

    let query = `SELECT * FROM tb_project WHERE id = ${id}`
    db.connect((err, client, done) => {
        if (err) throw err

        client.query(query, (err, result) => {
            done()
            if (err) throw err

            result = result.rows[0]

            result = {
                ...result,
                post_at: getDistanceTime(result.start_date, result.end_date),
                start: getFullTime(result.start_date),
                end: getFullTime(result.end_date)
                //appear: getTextInImage(result.technologies)
            }

            //console.log(result);
            res.render('projectdetail', {blog : result})
        })
    })
    //console.log(id);
    //res.render('projectdetail', {id : id})
})

//create endpoint delete
app.get('/blog-delete/:id', (req, res)=>{
    //let index = req.params.index
    let { id } = req.params

    let query = `DELETE FROM tb_project WHERE id = ${id}`
    db.connect((err, client, done)=>{
        if (err) throw err

        client.query(query, (err, result)=>{
            done()
            if (err) throw err

            res.redirect('/home')
        })
    })

    //console.log(`index delete : ${index}`);
    //blogs.splice(index, 1)
    //res.redirect('/home')
})

//create end point update/edit
app.get('/blog-edit/:id', (req, res)=>{
    let {id} = req.params

    let query = `SELECT * FROM tb_project WHERE id = ${id}`

    db.connect((err, client, done)=>{
        if (err) throw err

        client.query(query, (err, result)=>{
            done()
            if (err) throw err

            result = result.rows[0]

            res.render('blog-edit', { blog: result})
        })
    })
    //res.render('blog-edit')
})

//create post method for edit blog
app.post('/blog-edit/:id',upload.single('image'), (req, res)=>{
    let {id} = req.params
    let {projectName, startDate, endDate, description, checkskill} =req.body

    if (projectName == '' || startDate == '' || endDate == '' || description == '' || checkskill == '') {
        req.flash('error', 'Please insert all field!');
        return res.redirect('/add-project');
    }

    let data ={
        image: req.file.filename,
    }

    //console.log(checkskill);

    let query =`UPDATE tb_project SET name ='${projectName}', start_date='${startDate}', end_date='${endDate}',description='${description}', technologies='{${checkskill}}', image='${data.image}' WHERE id =${id}`
    
    //console.log(query);

    db.connect((err, client, done)=>{
        if (err) throw err
        
        client.query(query, (err, result)=>{
            done()
            if (err) throw err

            res.redirect('/home')
        })
    })
})

//create register endpoint
app.get('/register', (req, res)=>{
    res.render('register')
})

app.post('/register', (req, res)=>{
    let {name, email, password} = req.body

    if (name == '' || email == '' || password == '') {
        req.flash('error', 'Please insert all field!');
        return res.redirect('/register');
    }

    let hashPassword = bcrypt.hashSync(password, 10)

    db.connect((err, client, done)=>{
        if(err) throw err

        let query = `INSERT INTO tb_user(name1, email, password) VALUES
                        ('${name}','${email}','${hashPassword}')`
        
        client.query(query, (err, result)=>{
            done()
            if(err) throw err
            req.flash('success', ' Account succesfully registered')

            res.redirect('/login')
        })
    })
})

//create login endpoint
app.get('/login', (req, res)=>{
    res.render('login')
})

app.post('/login', (req, res)=>{

    let {email, password} = req.body

    db.connect((err, client, done)=>{
        if(err) throw err

        let query = `SELECT * FROM tb_user WHERE email='${email}'`

        client.query(query, (err, result)=>{
            done()
            if(err) throw err

            if(result.rowCount == 0){
                req.flash('danger','Account not found!')
                return res.redirect('/login')
            }
            
            let isMatch = bcrypt.compareSync(password, result.rows[0].password)

            if(isMatch){
                req.session.isLogin = true
                req.session.user = {
                    id : result.rows[0].id,
                    email : result.rows[0].email,
                    name1 : result.rows[0].name1
                }
                req.flash('success','Login success')
                res.redirect('/home')
            }else{
                req.flash('danger','Account not found!')
                res.redirect('/login')
            }
            //console.log(result);
        })
    })
})

//create logout
app.get('/logout', (req, res)=>{
    req.session.destroy()
    res.redirect('/home')
})

//create endpoint contact me
app.get('/contact-me', function(req, res){
    res.render('contact', {
        isLogin: req.session.isLogin, 
        user: req.session.user
    })
})

//konfigurasi port application
const port = 5100
app.listen(port, function(){
    console.log(`server running on PORT ${port}`);
})


function getFullTime(time) {
    let date = time.getDate()
    let monthIndex = time.getMonth()
    let year = time.getFullYear()

  
    let fullTime = `${date} ${month[monthIndex]} ${year} WIB`
  
    return fullTime
}

function getDistanceTime(start, end) {
    let timeStart = new Date(start)
    let timeEnd = new Date(end)
  
    let distance = timeEnd - timeStart // miliseconds
    //console.log(distance)
  
    let dayDistance = Math.floor(distance / ( 365 * 24 * 60 * 60 * 1000))
    //console.log(dayDistance)
  
    if(dayDistance != 0){
      return dayDistance + ' year'
    }else {
      let monthDistance = Math.floor(distance / ( 31 * 24 * 60 * 60 * 1000))
      
      if(monthDistance != 0) {
        return monthDistance + ' month'
      }else {
        let weekDistance = Math.floor(distance / (7 * 24 * 60 * 60 * 1000))
  
        if(weekDistance != 0){
          return weekDistance + ' week'
        }else{
          let dayDistance = Math.floor(distance / ( 24 * 60 * 60 * 1000 ))
  
          if(dayDistance != 0){
            return dayDistance + ' day'
          }
        }
      }
    }
}