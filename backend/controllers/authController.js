const User = require("../models/User");
const bcrypt = require("bcrypt");
const crypto = require("crypto"); // Used for generating tokens

// Register User
exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const authToken = crypto.randomBytes(30).toString("hex"); // Generate a random token

    user = new User({ name, email, password: hashedPassword, role, authToken });
    await user.save();

    res.status(201).json({ message: "User registered successfully", token: authToken, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Login User
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate new token on login (Optional)
    const authToken = crypto.randomBytes(30).toString("hex");
    user.authToken = authToken;
    await user.save();

    res.json({ token: authToken, role: user.role });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
