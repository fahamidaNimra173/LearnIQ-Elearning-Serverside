const express = require('express')

const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000
require('dotenv').config()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
app.use(cors());
app.use(express.json())
const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);


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

        // await client.connect();
        app.get('/', (req, res) => {
            res.send('Hello World!')
        })

        app.post('/jwt', async (req, res) => {
            const { email } = req.body;
            const user = { email }
            const token = jwt.sign(user, 'secret', {
                expiresIn: '1h'
            });
            res.send({ token })
        })

        const userCollection = client.db('courcesDB').collection('users')
        const teacherCollection = client.db('courcesDB').collection('teachers')
        const courcesCollection = client.db('courcesDB').collection('cources');
        const enrollmentCollection = client.db('courcesDB').collection('enrollment');
        const assignmentCollection = client.db('courcesDB').collection('assignments');
        const submittedAssignmentCollection = client.db('courcesDB').collection('submittedAssignment');
        const feedBackCollection = client.db('courcesDB').collection('feedBack');
        const freeCourseMix = client.db('courcesDB').collection('freeCourseMix');
        const freeCourseEDX = client.db('courcesDB').collection('edx');
        const freeCourseUdemy = client.db('courcesDB').collection('udemyIT&SoftwareFree')

 


        app.post('/users', async (req, res) => {

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
        app.get('/users/me', async (req, res) => {
            const email = req.query.email;
            if (!email) return res.status(400).send({ error: 'Email is required' });

            const user = await userCollection.findOne({ email });
            if (!user) return res.status(404).send({ error: 'User not found' });

            res.send(user);
        });
        app.get('/allUser', async (req, res) => {


            const user = await userCollection.find().toArray();


            res.send(user);
        });
        //  GET all users or search by email
        function escapeRegex(text) {
            return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        }
        app.get('/users', async (req, res) => {
            const email = req.query.email;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            function escapeRegex(text) {
                return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            }

            let query = {};

            if (email) {
                const escapedEmail = escapeRegex(email);
                const regex = new RegExp('^' + escapedEmail, 'i');
                query = {
                    $or: [
                        { email: { $regex: regex } },
                        { name: { $regex: regex } }
                    ]
                };
            }

            try {
                const total = await userCollection.countDocuments(query); // ✅ total count
                const users = await userCollection
                    .find(query)
                    .skip(skip)
                    .limit(limit)
                    .toArray();

                res.send({
                    total,
                    page,
                    limit,
                    users
                });
            } catch (error) {
                res.status(500).send({ error: 'Failed to fetch users' });
            }
        });


        // app.get('/users', async (req, res) => {
        //     const email = req.query.email;

        //     if (email) {
        //         const escapedEmail = escapeRegex(email);
        //         const regex = new RegExp('^' + escapedEmail, 'i');  // <-- starts with, case-insensitive

        //         const users = await userCollection.find({
        //             $or: [
        //                 { email: { $regex: regex } },
        //                 { name: { $regex: regex } }
        //             ]
        //         }).toArray();

        //         console.log('Searching for:', escapedEmail);

        //         if (!users.length) return res.status(404).send('No users found');
        //         return res.send(users);
        //     }

        //     const users = await userCollection.find().toArray();
        //     res.send(users);
        // });





        //  PATCH to make a user admin


        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const result = await userCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: 'admin' } }
            );
            res.send(result);
        });

        app.post('/teacher-request', async (req, res) => {
            const teacher = req.body;
            const result = await teacherCollection.insertOne(teacher);
            res.send(result)
        })

        app.get('/teacher-request', async (req, res) => {
            var query = {};
            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }

            const result = await teacherCollection.find(query).toArray();
            res.send(result)
        })

        //  Approve request and update user role to teacher
        app.patch('/teacher-request/approve/:id', async (req, res) => {
            const id = req.params.id;
            const teacherResult = await teacherCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'accepted' } }
            );

            const teacher = await teacherCollection.findOne({ _id: new ObjectId(id) });
            const userUpdate = await userCollection.updateOne(
                { email: teacher.email },
                { $set: { role: 'teacher' } }
            );

            res.send({ teacher, userUpdate });
        });

        // updating the status from rejected to pending
        app.patch('/teacher-request', async (req, res) => {
            const { email } = req.query;
            const updateDoc = {
                $set: {
                    status: req.body.status,
                    title: req.body.title,
                    experience: req.body.experience,
                    category: req.body.category
                }
            };

            const result = await teacherCollection.updateOne({ email }, updateDoc);
            res.send(result);
        });


        //  Reject request
        app.patch('/teacher-request/reject/:id', async (req, res) => {
            const id = req.params.id;
            const result = await teacherCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: 'rejected' } }
            );
            res.send(result);
        });
        // Add cources from teacher
        app.post('/cources', async (req, res) => {
            const newClass = req.body;
            const result = await courcesCollection.insertOne(newClass);
            res.send(result);
        });
        app.get('/cources', async (req, res) => {
            const status = req.query.status;
            const email = req.query.email;
            const query = {}


            if (email) {
                query.email = email;
            }

            if (status) {
                query.status = status;
            }

            const result = await courcesCollection.find(query).toArray();
            res.send(result);
        });

        // GET: Sorted and approved courses by total enrollment (ascending)
        app.get('/sorted-courses', async (req, res) => {
            try {
                const sortedCourses = await courcesCollection
                    .find({ status: 'approved' })
                    .sort({ totalEnroll: -1 })
                    .toArray();

                res.send(sortedCourses);
            } catch (error) {
                res.status(500).send({ error: 'Failed to fetch sorted approved courses' });
            }
        });


        app.get('/cources/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const result = await courcesCollection.findOne(query);
            res.send(result);
        });

        app.patch('/cources/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const result = await courcesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.send(result);
        });


        app.delete('/cources/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const result = await courcesCollection.deleteOne(query);
            res.send(result);
        });



        // update cources status to approve
        app.patch('/cources/approve/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await courcesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: 'approved' } }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: 'Failed to approve class.' });
            }
        });


        // update cources status to reject
        app.patch('/cources/reject/:id', async (req, res) => {
            const id = req.params.id;

            try {
                const result = await courcesCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { status: 'rejected' } }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: 'Failed to reject class.' });
            }
        });
        //updated total enrollment(increased by 1 on every enrollment of student) 
        app.patch('/cources/:id/increment-enroll', async (req, res) => {
            const courseId = req.params.id;
            const result = await courcesCollection.updateOne(
                { _id: new ObjectId(courseId) },
                { $inc: { totalEnroll: 1 } }
            );

            if (result.modifiedCount > 0) {
                res.status(200).send({ message: 'Enrollment count incremented' });
            } else {
                res.status(404).send({ message: 'Course not found or not updated' });
            }
        });


        //API's for free courses
        //instead of creating 3 different api , i will marge them in one to simplkifiled pagination and filtering

        app.get('/freeCourses', async(req,res)=>{
            const[mix,edx,udemy]=await Promise.all([
                freeCourseMix.find().toArray(),
                freeCourseEDX.find().toArray(),
                freeCourseUdemy.find().toArray()
            ])
            const freeCourses=[...mix,...edx,...udemy];
            res.send(freeCourses)
        })



        // //free courses from 10 min school,ostad,alison
        // app.get('/freeCourseMix', async (req, res) => {
        //     const result = await freeCourseMix.find().toArray();
        //     res.send(result)
        // })
        // //free courses from EDX
        // app.get('/freeCourseEDX', async (req, res) => {
        //     const result = await freeCourseEDX.find().toArray();
        //     res.send(result)
        // })
        // //free courses from Udemy
        // app.get('/freeCourseUdemy', async (req, res) => {
        //     const result = await freeCourseUdemy.find().toArray();
        //     res.send(result)
        // })




        // POST: Save new enrollment
        app.post('/enrollment', async (req, res) => {
            const enrollment = req.body;
            const result = await enrollmentCollection.insertOne(enrollment);
            res.send(result);
        });

        app.get('/enrollment', async (req, res) => {
            let query = {};
            if (req.query.studentEmail) {
                query = {
                    studentEmail: req.query.studentEmail
                };
            }

            const result = await enrollmentCollection.find(query).toArray();
            res.send(result);
        });
        //assignment post and get, find
        app.post('/assignment', async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result)
        })

        app.get('/assignment', async (req, res) => {
            let query = {}

            const result = await assignmentCollection.find({}).toArray();
            res.send(result);
        });

        app.get('/assignment/:id', async (req, res) => {
            const courseId = req.params.id;

            const result = await assignmentCollection.find({ courseId: courseId }).toArray();
            res.send(result);
        });


        // PATCH: Increase totalAssignment only
        app.patch('/cources/increment-assignment/:id', async (req, res) => {
            const { id } = req.params;
            const result = await courcesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { totalAssignment: 1 } }
            );
            res.send(result);
        });
        // PATCH: Increase totalSubmission
        app.patch('/cources/increment-submission/:id', async (req, res) => {
            const { id } = req.params;
            const result = await courcesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $inc: { totalSubmission: 1 } }
            );
            res.send(result);
        });
        // app.patch('/cources/update-assignment/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const updatedFields = req.body;

        //     const result = await courcesCollection.updateOne(
        //         { _id: new ObjectId(id) },
        //         { $set: updatedFields }
        //     );

        //     if (result.modifiedCount === 0) {
        //         return res.status(404).send({ message: 'Course not found or no update made.' });
        //     }

        //     res.send({ message: 'Assignment updated successfully', result });
        // });


        //to get and post submitted assignment
        app.post('/submission', async (req, res) => {
            const assignment = req.body;
            const result = await submittedAssignmentCollection.insertOne(assignment);
            res.send(result)
        })

        app.get('/submission', async (req, res) => {
            const { email, assignmentId } = req.query;

            let query = {};

            if (email) {
                query.userEmail = email;
            }

            if (assignmentId) {
                query.assignmentId = assignmentId;
            }

            const result = await submittedAssignmentCollection.find(query).toArray();
            res.send(result);
        });



        app.post('/feedback', async (req, res) => {
            const feedBack = req.body;
            const result = await feedBackCollection.insertOne(feedBack);
            res.send(result)
        })

        app.get('/feedback', async (req, res) => {
            const query = {};
            const result = await feedBackCollection.find(query).toArray();
            res.send(result)
        })
        // to get total datas of all collection
        app.get('/counts', async (req, res) => {
            try {
                const userCount = await userCollection.estimatedDocumentCount();
                const teacherCount = await teacherCollection.estimatedDocumentCount();
                const courseCount = await courcesCollection.estimatedDocumentCount();
                const enrollmentCount = await enrollmentCollection.estimatedDocumentCount();
                const assignmentCount = await assignmentCollection.estimatedDocumentCount();
                const submittedAssignmentCount = await submittedAssignmentCollection.estimatedDocumentCount();
                const feedbackCount = await feedBackCollection.estimatedDocumentCount();

                res.send({
                    users: userCount,
                    teachers: teacherCount,
                    courses: courseCount,
                    enrollments: enrollmentCount,
                    assignments: assignmentCount,
                    submittedAssignments: submittedAssignmentCount,
                    feedbacks: feedbackCount,
                });
            } catch (error) {
                console.error(error);
                res.status(500).send({ error: 'Failed to get counts' });
            }
        });



        // stripe js payment api
        app.post('/create-payment-intent', async (req, res) => {
            const amountInCent = req.body.amount
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountInCent, // amount in cents
                    currency: 'usd',
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                res.send({
                    clientSecret: paymentIntent.client_secret,
                });
            } catch (error) {
                res.status(400).send({ error: error.message });
            }
        });


    } finally {

    }
}
run().catch(console.dir);



app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
