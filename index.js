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
        const teacherCollection = client.db('courcesDB').collection('teachers')

        app.get('/users', async (req, res) => {
            const email = req.query.email;

            if (email) {
                // Find specific user by email
                const user = await userCollection.findOne({ email });
                if (!user) return res.status(404).send('User not found');
                return res.send(user);
            }

            // If no email is provided, return all users
            const allUsers = await userCollection.find({}).toArray();
            res.status(200).send(allUsers);
        });


        app.post('/users', async (req, res) => {
            const userCollection = client.db('courcesDB').collection('users');

            const email = req.body.email;


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

        app.get('/users', async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send('Email required');
            const query = {
                userEmail: email
            }
            const user = await userCollection.findOne(query);
            if (!user) return res.status(404).send('User not found');

            res.send(user);
        });
        app.post('/teacher-request', async (req, res) => {
            const teacher = req.body;
            const result = await teacherCollection.insertOne(teacher);
            res.send(result)
        })

        app.get('/teacher-request', async (req, res) => {
            var query={};
            if(req.query.email){
                 query={
                email:req.query.email
            }
            }
           
            const result = await teacherCollection.find(query).toArray();
            res.send(result)
        })


    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
