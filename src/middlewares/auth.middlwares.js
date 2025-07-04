import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"


 export const verifyJwt = asyncHandler(async(req,_,next)=>{
         try {
             const token = req.cookies?.accessToken || req.header("Authentication")?.replace("Bearer ", "");
   
             if(!token){
               throw new ApiError(401 , "Unauthorized rquest"); 
             }
   
          const decodedToken =    jwt.verify(token , process.env.ACCESS_TOKEN_SECRET);
           const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
           if(!user){
               throw new ApiError(401 , "Unauthorized Token");
           }

           req.user = user;
           next()
   
         } catch (error) {
            throw new ApiError(401 , error?.message || "invalid access token (auth.middleware)")
         }
 })