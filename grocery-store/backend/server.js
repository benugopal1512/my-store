const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- MONGODB CONNECTION ---
const ATLAS_URI = 'mongodb://benugopalagrawal615_db_user:' + encodeURIComponent('benu1512') + '@ac-vclfl5v-shard-00-00.6p4otkk.mongodb.net:27017,ac-vclfl5v-shard-00-01.6p4otkk.mongodb.net:27017,ac-vclfl5v-shard-00-02.6p4otkk.mongodb.net:27017/?ssl=true&replicaSet=atlas-aqzi5n-shard-0&authSource=admin&appName=Cluster0';
const MONGO_URI = process.env.MONGO_URI || ATLAS_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('Successfully connected to MongoDB instance'))
  .catch((err) => console.error('MongoDB connection initialization failed:', err));

// --- DATA SCHEMAS & MODELS ---

// 👤 Dynamic User Schema for Unique Credentials
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
});
const User = mongoose.model('User', userSchema);

// 🍏 Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, default: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400' }
});
const Product = mongoose.model('Product', productSchema);

// 📦 Order Schema
const orderSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  paymentMethod: { type: String, default: 'Cash on Delivery (COD)' },
  items: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);


// --- API ROUTE ENDPOINTS ---

// 🆕 Route: Dynamic User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Username is already taken." });
    }

    // Securely hash unique user password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      username,
      password: hashedPassword,
      role: role || 'customer'
    });

    await newUser.save();
    res.status(201).json({ success: true, message: "User registered successfully!" });

  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to compile registration configurations." });
  }
});


// 🔑 Route: Dynamic Secure Portal Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: "Please fill out all credentials." });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password configuration." });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: "Invalid username or password configuration." });
    }

    return res.json({ 
      success: true, 
      username: user.username, 
      role: user.role 
    });

  } catch (error) {
    res.status(500).json({ success: false, error: "Authentication system failure." });
  }
});


// 🍏 Route: Fetch Entire Store Catalog
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch product library records" });
  }
});


// ➕ Route: Create and Publish a New Grocery Item
app.post('/api/products', async (req, res) => {
  try {
    const { name, price, unit, category, image } = req.body;
    const newProduct = new Product({ name, price: Number(price), unit, category, image });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: "Failed to create catalog inventory entry" });
  }
});


// 📦 Route: Fetch All Placed Orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to stream incoming orders channel" });
  }
});


// 🚀 Route: Submit a Checkout Request Package
app.post('/api/orders', async (req, res) => {
  try {
    const { customerName, phone, address, paymentMethod, items, totalAmount } = req.body;
    
    const newOrder = new Order({
      customerName,
      phone,
      address,
      paymentMethod,
      items,
      totalAmount
    });

    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ error: "Failed to record checkout data packet logs" });
  }
});


// 🛠️ Route: Update Active Dispatch Delivery Status
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order record match could not be identified" });
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(400).json({ error: "Failed to adjust status mutation variables" });
  }
});


// --- INITIALIZE SERVER ENGINE ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 FreshBasket Server running smoothly on Port ${PORT}`);
  console.log(`=================================================`);
});