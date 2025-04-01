const jwt = require("jsonwebtoken");

exports.googleAuth = (req, res) => {
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  
  res.cookie("token", token, { httpOnly: true, secure: true });
  res.redirect("/dashboard"); // Redirect to frontend/dashboard
};

exports.logout = (req, res) => {
  res.clearCookie("token");
  req.logout(() => {
    res.redirect("/");
  });
};