// import passport from "passport";
import UserDTO from "../dto/user.dto.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import userModel from "../dao/models/users.schema.js";
import { mailingConfig, generateToken, validatePassword, createHash } from "../utils.js";

const transport = nodemailer.createTransport(mailingConfig);

export const registerSession = async (req, res) => {
    res.send({ status: "success", message: "User registered" });
};

export const failedRegister = (req, res) => {
    res.status(400).send({ status: "error", error: "Registry fail" });
};

export const loginSession = async (req, res) => {
    if (!req.user)
        return res
            .status(400)
            .send({ status: "error", error: "Incorrect credentials" });
    let user = new UserDTO(req.user);
    console.log("usuario", user);
    req.session.user = user;
    res.send({
        status: "success",
        payload: req.session.user,
        message: "You logged in.",
    });
};

export const failedLogin = (req, res) => {
    res.status(400).send({ status: "error", error: "Login fail" });
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res
                .status(500)
                .send({ status: "error", error: "Couldn´t logout." });
        }
        res.redirect("/login");
    });
};

export const githubCallback = (req, res) => {
    req.session.user = req.user;
    res.redirect("/current");
};

export const sendEmail = (req, res) => {
    try {
        const email = req.params.email;
        const jwt = generateToken(email);
        console.log(jwt);
        console.log(mailingConfig.auth.user);
        transport.sendMail({
            from: `Coder <${mailingConfig.auth.user}>`,
            to: email,
            subject: "Recover password",
            html: `<h1>This is an email to recover your password, if you havent requested it ignore this message.</h1>
                        <hr>
                        <a href="http://localhost:8080/restorepass/${jwt}">CLICK HERE</a>
                    `,
        });

        res.send("An email has been send to you, verify your inbox to recover your password.");
    } catch (error) {
        req.logger.error(`Internal error sending email. ${error}`);
        res.status(500).send(`Internal server error. ${error}`);
    }
};

export const changePassword = async (req, res) => {
    try {
        const { token } = req.params;
        // console.log("soy el token", token);
        const { newPassword } = req.body;
        // console.log("soy el pw", newPassword);

        const data = jwt.decode(token);
        // console.log("soy el data", data);
        const email = data.email;
        // console.log("soy el email", email);

        const user = await userModel.findOne({ email });
        // console.log("soy el user", user);
        if (!user) {
            req.logger.error("User not found");
            res.status(404).send("User not found");
        }

        if (validatePassword(user, newPassword)) {
            req.logger.info("The password must be different.");
            res.status(400).send("Your password can´t be one that you used before.");
            return;
        }

        const hashedNewPassword = createHash(newPassword);
        // console.log("soy el hashedpw", hashedNewPassword);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).send("Your password has been changed.");
    } catch (error) {
        req.logger.error(`Interval error changing password. ${error}`);
        res.status(500).send(`Interval server error. ${error}`);
    }
};
