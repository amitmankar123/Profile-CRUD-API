import express from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser,changeCurrentPassword,
    currentUser,
    updateAccountdetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile, 
    getWatchHistory } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import {verifyJwt} from "../middlewares/auth.middlwares.js"
const router = express.Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },{
            name : "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

    router.route("/login").post(loginUser)

    // Secured router

    router.route("/logout").post(verifyJwt,logoutUser)
    router.route("/refresh-token").post (refreshAccessToken)  
    router.route("/change_password").post(verifyJwt,changeCurrentPassword)
    router.route("/current_user").get(verifyJwt,currentUser)
    router.route("/update_account").patch(verifyJwt,updateAccountdetails)
    router.route("/update_avatar").patch(verifyJwt,upload.single("avatar"),updateUserAvatar)
    router.route("/cover_image").patch(verifyJwt,upload.single("coverImage"),updateUserCoverImage)
    router.route("/c/:username").get(verifyJwt,getUserChannelProfile)
    router.route("/watch_history").get(verifyJwt, getWatchHistory)
    
export default router;