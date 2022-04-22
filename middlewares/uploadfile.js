//call multer
const multer = require('multer')

//setup config
const stroage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, "uploads")
    },
    filename: (req, file, cb)=>{
        cb(null, Date.now() + "-" + file.originalname.replace(/\s/g,""))
    }
})

//implentation config
const upload = multer({
    storage: stroage
})

module.exports = upload