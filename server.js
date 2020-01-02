const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
const mongoDBurl = "mongodb+srv://c1234:c1234@cluster01-olqhy.mongodb.net/test?retryWrites=true&w=majority";
const dbName = "test";
const assert = require('assert');
const ExifImage = require('exif').ExifImage;
const formidable = require('formidable');

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.render('index', { message: "" });
});

app.get('/index', function (req, res) {
    res.render('index', { message: "" });
});

app.post('/upload', function (req, res) {
    let form = new formidable.IncomingForm();

    const client = new MongoClient(mongoDBurl);
    client.connect((err) => {
        assert.equal(null, err);

        form.parse(req, function (err, fields, files) {
            let filename = files.photo.name;


            let new_r = {};
            new_r['title'] = fields.title;
            new_r['description'] = fields.description;
            new_r['photo'] = new Buffer.from(fs.readFileSync(files.photo.path)).toString('base64');

            try {
                new ExifImage({ image: files.photo.path }, function (error, exifData) {
                    if (error)
                        console.log('Error: ' + error.message);
                    else {
                        console.log(exifData); // Do something with your data!
                        new_r['make'] = exifData.image.Make.length > 0 ? exifData.image.Make : "";
                        new_r['model'] = exifData.image.Model.length > 0 ? exifData.image.Model : "";
                        new_r['create'] = exifData.exif.CreateDate.length > 0 ? exifData.exif.CreateDate : "";
                        new_r['lat'] = (exifData.gps.GPSLatitude) ? exifData.gps.GPSLatitude : "";
                        new_r['lon'] = (exifData.gps.GPSLongitude) ? exifData.gps.GPSLongitude : "";

                        try {
                            new_r['lat'] = (parseFloat(new_r['lat'][0]) + ((new_r['lat'][1]) / 60.00) + ((new_r['lat'][2]) / 3600.00));
                            new_r['lat'] = (exifData.gps.GPSLatitudeRef == 'W' || exifData.gps.GPSLatitudeRef == 'S') ? -new_r['lat'] : new_r['lat'];
                            new_r['lon'] = (parseFloat(new_r['lon'][0]) + ((new_r['lon'][1]) / 60.00) + ((new_r['lon'][2]) / 3600.00));
                            new_r['lon'] = (exifData.gps.GPSLongitudeRef == 'W' || exifData.gps.GPSLongitudeRef == 'S') ? -new_r['lon'] : new_r['lon'];
                        } catch (error) {
                            console.log('Error: ' + error.message);
                        }

                        console.log(new_r);
                    }
                });
            } catch (error) {
                console.log('Error: ' + error.message);
            }

            postUpload(client, new_r, (result) => {
                if (result) {
                    //insertion success
                    client.close();
                    res.status(200);
                    res.setHeader('Content-Type', 'text/html');
                    res.render('fileupload', { fields: new_r });
                } else {
                    //insertion failed
                    res.status(404);
                    res.setHeader('Content-Type', 'text/html');
                    res.render('index', { message: 'Error.' });
                }
            });
        });
    });
});

app.get('/map', function (req, res) {
    res.render('map', { 
        lon: req.query.lon,
        lat: req.query.lat
    });
});

function postUpload(client, obj, callback) {
    const db = client.db(dbName);
    db.collection('test').insertOne(obj, function (err, result) {
        if (err == null) {
            result = true;
            callback(result);
        } else {
            result = false;
            callback(result);
        }
    });
}


app.listen(process.env.PORT || 8099); 