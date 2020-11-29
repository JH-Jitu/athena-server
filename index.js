const express = require('express')
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
// const { ObjectId } = require('mongodb');
const app = express()
const port = 4200
require("dotenv").config();
const ObjectId = require('mongodb').ObjectId;


const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hdbqd.mongodb.net/${process.env.DB_USER}?retryWrites=true&w=majority`;
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('services'));
app.use(fileUpload());
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
    const servicesCollection = client.db("athena").collection("services");
    const userServicesCollection = client.db("athena").collection("userServices");
    const reviewCollection = client.db("athena").collection("review");
    const adminCollection = client.db("athena").collection("admin");

    // Uploading Services
    app.post("/addService", (req, res) => {
        const name = req.body.name;
        const innerPage = req.body.innerPage;
        const daySupport = req.body.daySupport;
        const price = req.body.price;


        servicesCollection.insertOne({ name, innerPage, daySupport, price })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    //   Show Services to home
    app.get('/services', (req, res) => {
        servicesCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    // Details
    app.get('/purchase/:_id', (req, res) => {
        servicesCollection.find({ _id: ObjectId(req.params._id) })
              .toArray((err, documents) => {
                res.send(documents[0]);
            });
    });

    // Adding Admin via email
    app.post("/addAdmin", (req, res) => {
        const email = req.body.email;
        adminCollection.insertOne({ email })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    // Adding Order
    app.post("/addOrder", (req, res) => {
        const name = req.body.name;
        const desc = req.body.desc;
        const email = req.body.email;
        const service = req.body.service;
        const price = req.body.price;
        const paymentId = req.body.paymentId


        userServicesCollection.insertOne({ name, desc, email, service, price, paymentId })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    // Showing Order
    app.get('/allOrders', (req, res) => {
        userServicesCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })


    // Making Review
    app.post("/review", (req, res) => {
        const name = req.body.name;
        const email = req.body.email;
        const desc = req.body.desc;
        const photo = req.body.photo;
        reviewCollection.insertOne({ name, email, desc, photo })
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    // Get Review Collection
    app.get('/getReview', (req, res) => {
        reviewCollection.find({})
            .toArray((err, documents) => {
                res.send(documents);
            })
    })

    // Status
    app.patch("/addStatus/:id", (req, res) => {
        const status = req.body.status;
        // console.log(status);
        userServicesCollection.updateOne(
            { _id: ObjectId(req.params.id) },
            { $set: { status } }
            )
            .then(result => {
                res.send(result.insertedCount > 0);
            })
    })

    // Finding Admin
    app.get('/findAdmin/:email', (req, res) => {
        adminCollection.find({email: req.params.email})
        // console.log(req.params.email)
            .toArray((err, documents) => {
                res.send(documents.length > 0);
            })
    })

    
    // Using firebase backend controller
    const admin = require('firebase-admin');
    var serviceAccount = require("./earn-2018-firebase-adminsdk-7kbrn-e239f4c90e.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIRE_DB
    });

    //   // CRUD এর  READ method (R) //     //
    app.get("/orders", (req, res) => {
        const bearer = req.headers.authorization
        if (bearer && bearer.startsWith('Bearer ')) {

            const idToken = bearer.split(' ')[1];

            // idToken comes from the client app
            admin.auth().verifyIdToken(idToken)
                .then(function (decodedToken) {
                    const tokenEmail = decodedToken.email;
                    const queryEmail = req.query.email;
                    let uid = decodedToken.uid;
                    // console.log({uid});

                    // // custom verification with email // //
                    if (tokenEmail == queryEmail) {
                        userServicesCollection.find({ email: queryEmail })
                            .toArray((err, documents) => {
                                res.status(200).send(documents);
                            })
                    }
                    else {
                        res.status(401).send("Unauthorized access!!")
                    }
                }).catch(function (error) {
                    res.status(401).send("Unauthorized access!!")
                    // Handle error
                });
        }

        else {
            res.status(401).send("Unauthorized access!!")
        }
    })
});


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(process.env.PORT || port)