const express = require('express')

const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
app.use(cors());
app.use(express.json())



const uri =
    `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.g5skvf8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        app.get('/', (req, res) => {
            res.send('Hello World!')
        })

        const userCollection = client.db('courcesDB').collection('users')

        app.get('/users', async (req, res) => {

            const allUsers = await userCollection.find({}).toArray();

            res.status(200).send(allUsers);

        });


    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
