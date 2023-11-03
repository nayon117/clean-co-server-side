const express = require('express')
const app = express()
require('dotenv').config()
const cookieParser = require('cookie-parser')
const jwt = require ('jsonwebtoken')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middlewares 
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials:true
}))




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3hdabzk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
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
      
      //   collection 
      const serviceCollection = client.db('clean-co').collection('services')
      const bookingCollection = client.db('clean-co').collection('bookings')

      //   middlewares 
      const verifyToken =  (req, res, next) => {
          const { token } = req.cookies
          if (!token) {
              res.status(401).send({message:'unauthorized'})
          }
          jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
              if (err) {
                  res.status(401).send({message:'unauthorized'})
              }
              req.user = decoded;
              next()
          })
      }

      //   get 
      app.get('/api/v1/services', async (req, res) => {
        try {
            const cursor = serviceCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        } catch (error) {
            console.log(error);
        }
      })

      //   post
      app.post('/api/v1/user/create-booking', async (req, res) => {
       try {
        const booking = req.body;
        const result = await bookingCollection.insertOne(booking)
        res.send(result)
       } catch (error) {
        console.log(error);
       }
      })

      //   user specific bookings
      app.get('/api/v1/user/bookings',verifyToken, async (req, res) => {
         try {
            const queryEmail = req.query.email;
             const tokenEmail = req.user.email
             
             if (queryEmail !== tokenEmail) {
                 res.status(403).send({message:'forbidden access'})
             }
             let query = {}
             if (queryEmail) {
                 query.email= queryEmail
             }

            const result = await bookingCollection.find(query).toArray()
            res.send(result)
         } catch (error) {
            console.log(error);
         }
      })

      //   delete 
      app.delete('/api/v1/user/cancel-booking/:bookingId', async (req, res) => {
         try {
            const id = req.params.bookingId;
            const query = {_id: new ObjectId(id)}
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
         } catch (error) {
            console.log(error);
         }
      })

      //   auth releted
      app.post('/api/v1/auth/access-token', async (req, res) => {
          const user = req.body;
          const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: 60 * 60 })
          res.cookie('token', token, {
              httpOnly: true,
              secure: true,
              sameSite:'none'
          }).send({success:true})
      })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})