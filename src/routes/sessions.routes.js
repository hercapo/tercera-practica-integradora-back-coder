import { Router } from "express";
import passport from "passport";
import { registerSession, failedRegister, loginSession, failedLogin, logout, githubCallback, sendEmail, changePassword } from '../controllers/sessions.controller.js';
import { validateToken } from '../utils.js';

const router = Router();


router.post(
    "/register",
    passport.authenticate("register", { failureRedirect: "/sessions/failregister" }),
    registerSession
);

router.get("/failregister", failedRegister);

router.post(
    "/login",
    passport.authenticate("login", { failureRedirect: "/sessions/faillogin" }),
    loginSession
);

router.get("/faillogin",failedLogin);

router.get("/logout", logout)

router.get("/github", passport.authenticate("github", {scope: ["user:email"]}), async(req, res) => {

})


router.get("/githubcallback", passport.authenticate("github", {failureRedirect: "/login"}), githubCallback)

router.get("/recoveremail/:email", sendEmail)

router.post("/changepassword/:token", validateToken, changePassword)


export default router;
