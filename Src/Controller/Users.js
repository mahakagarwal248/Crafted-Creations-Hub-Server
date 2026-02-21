import userModel from "../Models/Users.js";

export const addUser = async (req, res) => {
    try {
        let { name, email, phone, password, shippingAddress} = req.body;

        if(!name || !email || !phone || !password) throw {Status: "Error", Message: "Incomplete Data!"}

        const user = await userModel.findOneAndUpdate({email},{
            name,
            email,
            phone,
            password,
            shippingAddress
        },{
            upsert: true,
            new: true
        })

        if(!user) return res.status(400).json({message: "Something Went Wring!"})
        
        return res.status(200).json(user)
    } catch (error) {
        console.log(error);
        res.status(500).json(error);
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }
        const user = await userModel.findOne({ email }).lean();
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
}