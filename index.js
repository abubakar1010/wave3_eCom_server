const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PROT || 5000;

app.use(
	cors({
		origin: ["http://localhost:5173"],
		credentials: true,
	})
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a2ulpwj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

async function run() {
	try {
		// Connect the client to the server	(optional starting in v4.7)
		// await client.connect();

		const usersCollection = client.db("wave-3-eCom").collection("users");
		const productCollection = client.db("wave-3-eCom").collection("product");

		// middleware

		//custom middleware

		// middleware

		const verifyToken = (req, res, next) => {
			// console.log("verify token",req.headers.authorization);

			if (!req.headers.authorization) {
				return res.status(401).send({ message: "unauthorized access" });
			}
			const token = req.headers.authorization.split(" ")[1];
			jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
				if (err)
					return res.status(401).send({ message: "unauthorized access" });
				req.decoded = decoded;
				next();
			});
		};

		//verify admin middleware

		//verify admin middleware

		const verifyAdmin = async (req, res, next) => {
			const email = req.decoded.email;

			const query = { email };
			const result = await usersCollection.findOne(query);
			const isAdmin = result?.role === "admin";
			if (!isAdmin) {
				return res.status(403).send({ message: "forbidden access" });
			}
			next();
		};

		//verify seller middleware

		const verifySeller = async (req, res, next) => {
			const email = req.decoded.email;

			const query = { email };
			const result = await usersCollection.findOne(query);
			const isSeller = result?.role === "seller";
			if (!isSeller) {
				return res.status(403).send({ message: "forbidden access" });
			}

			next();
		};

		//verify buyer middleware

		const verifyBuyer = async (req, res, next) => {
			const email = req.decoded.email;

			const query = { email };
			const result = await usersCollection.findOne(query);
			const isBuyer = result?.role === "buyer";
			if (!isBuyer) {
				return res.status(403).send({ message: "forbidden access" });
			}
			next();
		};

		// make jwt token

		app.post("/jwt", async (req, res) => {
			const user = req.body;
			const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
				expiresIn: "1h",
			});
			res.send({ token });
		});

		// user endpoints

		// fetched all users
		app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
			const result = await usersCollection.find().toArray();
			res.send(result);
		});

		// fetched admin user

		app.get("/users/admin/:email", verifyToken, async (req, res) => {
			const email = req.params.email;

			if (email !== req.decoded.email)
				return res.status(403).send({ message: "forbidden access" });
			const filter = { email: email };
			const result = await usersCollection.findOne(filter);

			let admin = false;
			if (result) {
				admin = result?.role === "admin";
			}
			res.send({ admin });
		});

		// insert a user

		app.post("/users", async (req, res) => {
			const user = req.body;

			const query = { email: user.email };
			const isExist = await usersCollection.findOne(query);
			// console.log(user, query, isExist);
			if (isExist)
				return res.send({
					message: "user already exist",
					insertedId: null,
				});
			const result = await usersCollection.insertOne(user);
			res.send(result);
		});

		// delete users

		app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await usersCollection.deleteOne(query);
			res.send(result);
		});

		//update user

		app.patch(
			"/users/admin/:id",
			verifyToken,
			verifyAdmin,
			async (req, res) => {
				const id = req.params.id;
				const filter = { _id: new ObjectId(id) };
				const updatedDocs = {
					$set: {
						role: "admin",
					},
				};
				const result = await usersCollection.updateOne(filter, updatedDocs);
				res.send(result);
			}
		);

		// product endpoints

		//insert item on new

		app.post("/add-product", async (req, res) => {
			const { product } = req.body;

			const existedProduct = await productCollection.findOne({
				title: product.title,
			});

			if (existedProduct) return res.json({ message: "Product already exist" });

			const result = await productCollection.insertOne({
				...product,
				price: parseFloat(product.price),
			});

			res.json({ message: "Product successfully added", result });
		});

		// find all product from product collection

		app.get("/product", async (req, res) => {
			const result = await productCollection.find().toArray();
			res.send(result);
		});

		// fetched seller all product using seller email from product collection

		app.get("/product/user/:email", verifyToken, async (req, res) => {
			const emailId = req.params.email;
			// console.log(emailId);

			const query = { authorEmail: emailId };
			const result = await productCollection.find(query).toArray();
			res.send(result);
		});

		// get specific item from product collection

		app.get("/product/:id", async (req, res) => {
			const id = req.params.id;

			const query = { _id: new ObjectId(id) };

			const result = await productCollection.findOne(query);
			res.send({ result, update });
		});

		// add endpoint to delete product

		app.delete("/product/:id", verifyToken, async (req, res) => {
			const id = req.params.id;
			const query = { _id: new ObjectId(id) };
			const result = await productCollection.deleteOne(query);
			res.send(result);
		});

		app.patch("/product/:id", verifyToken, async (req, res) => {
			const id = req.params.id;

			const { title, tags, publisher, description, image } = req.body;
			const filter = { _id: new ObjectId(id) };
			const updatedDocs = {
				$set: {
					title,
					tags,
					publisher,
					description,
					image,
				},
			};
			const result = await productCollection.updateOne(filter, updatedDocs);
			res.send(result);
		});

		// Send a ping to confirm a successful connection
		// await client.db("admin").command({ ping: 1 });
		// console.log(
		//   "Pinged your deployment. You successfully connected to MongoDB!"
		// );
	} finally {
		// Ensures that the client will close when you finish/error
		// await client.close();
	}
}
run().catch(console.dir);

app.get("/", async (req, res) => {
	res.send(`wave-3 server is running on prot ${port}`);
});

app.listen(port, () => {
	console.log(`wave-3 server is running on prot ${port}`);
});
