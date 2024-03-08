const router = require("express").Router();
const { datarule, validate } = require("../models/datarule");
// const bcrypt = require("bcrypt");

router.post("/data", async (req, res) => {
	try {
		const { error } = validate(req.body);
		
		await new datarule({ ...req.body}).save();
		res.status(201).send({ message: "User created successfully" });
	} catch (error) {
		res.status(500).send({ message: "Internal Server Error" });
		console.log(error);
	}
});

module.exports = router;