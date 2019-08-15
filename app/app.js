//const ipfsClient = require('ipfs-http-client');
const proxy = require('http-proxy-middleware');
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const fs = require('fs');


//const ipfs = new ipfsClient({ host: 'localhost', port: '5001', protocol:'http'});
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(fileUpload());
app.use(express.static(__dirname+'/public'));

//Set of gets on hoe to handle the links from the main page
app.get('/', (req, res) => {
    res.render('home');
});

app.get('/home', (req, res) => {
    res.render('home');
});

app.get('/Transaction', (req, res) => {
    res.render('Transaction');
});

app.get('/ValidatorFee', (req, res) => {
    res.render('ValidatorFee');
});

app.get('/Stake', (req, res) => {
    res.render('Stake');
});

app.get('/Song', (req, res) => {
    res.render('Song');
});

app.get('/Royalty', (req, res) => {
    res.render('Royalty');
});

app.get('/Contract', (req, res) => {
    res.render('Contract');
});


//handle the upload of a file via ipfs
/*app.post('/upload', (req,res) => {
    const file = req.files.file;
    const fileName = req.body.fileName;
    const filePath = 'files/' + fileName;
    const usershare = req.body.usershare;
    const previousID = req.body.previousID;

    file.mv(filePath, async (err) => {
        if (err) {
            console.log('Error: failed to download the file');
            return res.status(500).send(err);
        }

        const fileHash = await addFile(fileName, filePath);
        fs.unlink(filePath, (err) => {
            if (err) console.log(err);
        });

        res.render('upload', { fileName, fileHash, usershare, previousID});
    });
});

//const addFile = async (fileName, filePath) => {
    //const file = fs.readFileSync(filePath);
    //const fileAdded = await ipfs.add({path: fileName, content: file});
    //const fileHash = fileAdded[0].hash;

    //return fileHash;
//}
*/
app.listen(8080, () => {
    console.log('Server is listening on port 8080');
});
