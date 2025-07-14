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
        
        await client.connect();
        app.get('/', (req, res) => {
            res.send('Hello World!')
        })

        const userCollection = client.db('courcesDB').collection('users')

        app.get('/users', async (req, res) => {

            const allUsers = await userCollection.find({}).toArray();

            res.status(200).send(allUsers);

        });

        app.post('/users', async (req, res) => {
            const userCollection = client.db('courcesDB').collection('users');

            const email = req.body.email;

            // Check if user already exists
            const userExists = await userCollection.findOne({ email });
            if (userExists) {
                //  update lastLogin of user
                await userCollection.updateOne(
                    { email },
                    { $set: { lastLogin: req.body.lastLogin || new Date().toISOString() } }
                );

                return res.status(200).send({ message: 'User already exists', inserted: false });
            }

           
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        });


    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
