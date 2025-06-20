import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
//import router from "../routes/user.routes.js";

import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { json } from "express";
import mongoose from "mongoose";



const generateAccessAndRefreshTokens = async function (userId){
      console.log("generateAccessAndRefreshTokens" , userId)
      try {
            // find user by userId
       // genrate acess token
       // genrate refresh token
       // store in data base
       // save
       // return tokens

       const user =await User.findById(userId)
       
     const accessToken = userId.generateAccessToken();
     const refreshToken = userId. generateRefreshToken();
     
     user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false})
    return {accessToken,refreshToken};



      } catch (error) {
            throw new ApiError(500 , "Some thing went wrong while genreting and access token" && error);
      }
}


const registerUser = asyncHandler(async(req , res)=>{
      /*
      get user details from frontend
      
      validate - not empty
      
      check if user already exists : username and email
      
      check for image , check for avtar
      
      upload them to cloudinary , avtar
      
      create user object - create entry in data base
      
      remove password and refreah the token files from response

      check user creation
      
      return res
      */

       const {username , email , fullname , password} = req.body
       console.log("email : ", email)
       console.log("password:" , password)
  
      //  if(fullname === "") {
      //       throw new ApiError(400 , "full name require")
      //  } 

    // validation for fillings
      if(
            // ek bar check krna hai
            [username,email,password,fullname].some((field)=>
                  field ===""  || field === null || field === undefined  
             )
      ){
            throw new ApiError(400 , "All fields are required ")

      }



    const existedUser = await  User.findOne({
         $or:[{username} , {email}]
      })

      if(existedUser){
            throw new ApiError(409, "user or email already exist")
      }

      const avatarLocalPath =await req.files?.avatar[0]?.path;
     // const coverImageLocalPath =await req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
     if(req.body && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
      coverImageLocalPath = await req.files.coverImage[0].path;
     }

      if(!avatarLocalPath){
            throw new ApiError(400,
                  "Avatar is required"
            )
      }

 const avatar = await  uploadOnCloudinary 
      (avatarLocalPath)

const coverImage  = await uploadOnCloudinary(coverImageLocalPath)

if(!avatar){
      throw new ApiError(400, "avatar requires 1")
}

const user = await User.create({
      fullname,
      avatar : avatar.url,
      coverImage : coverImage?.url ||"",
      email,
      password,
      username : username.toLowerCase()
})

const createdUser = await User.findById(user._id).select("-password -refreshToken")
 
if(!createdUser){
      throw new ApiError(500 , "something went wrong while registering the user")
}

   return res.status(201).json( new ApiResponse(200, createdUser, "User registered sucessfully")
   )


})


const loginUser = asyncHandler(async function(req , res){
      // rq.body --> data
      // username or email
      // find user
      // password check
      // access token and  refresh token
      // send cookie

      const {email , username,password} = req.body;

      if(!email && !username){
            
            throw new ApiError(401 , "username or email password is required");
      }

      const user = await User.findOne({
            $or:[{email} , {username}],
      })

      if(!user){
            throw new ApiError(404   , "user does not exist ")
      }
      const isPasswordValid  = await user.isPasswordCorrect(password)
     if(!isPasswordValid){
      throw new ApiError(401 , "password is incorrect")
     }

   const {accessToken, refreshToken} = await  generateAccessAndRefreshTokens(user);
  const loggedInUser =  await User.findById(user._id).select("-password -refreshToken")
     
  const option = {
      httpOnly: true,
      secure : true
  }
      return res
      .status(200)
      .cookie("accessToken" ,accessToken , option)
      .cookie("refreshToken" , refreshToken, option)
      .json(
         new  ApiResponse(
            200,{
                  user: loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully"
          )
      )


})

const logoutUser = asyncHandler(async (req, res)=>{

      await User.findByIdAndUpdate(
          req.user._id,
          {
                $set: {
                      refreshToken :undefined
                }
          }
          ,{
                new:true
          }
      )
      
      const option = {
          httpOnly: true,
          secure : true
      }

      return res
      .status(200)
      .clearCookie("accessToken" , option)
      .clearCookie("refreshToken" , option)
      .json(new ApiResponse(200 , {} , "User logged out Successfully"))

})

const refreshAccessToken = asyncHandler(async (req , res) =>{
      //incoming token from user
      //by the using cookie or rq.body
      //decodedToken by the using jwt.verify( incomingReftoken , refresh token secret)
      //comapre between incoming and decodedToken
      // return

      const incomingRefreshToken = rq.cookies.refreshToken || req.body.refreshToken;

      if(!incomingRefreshToken){
            throw new ApiError(401 , "error in incomingRefresh Token")
      }
            
  try {
          const decodedToken  = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET)
            const user = User.findById(decodedToken?._id) 
            if(!user){
                throw ApiError(401 , "unauthorized request")
            }  
    
            if(incomingRefreshToken != user?.refreshToken){
                throw new ApiError(401 , "incoming token != to user REfreah token")
            }
            const option = {
                httpOnly : true,
                secure: true
            }
    
       const {accessToken , newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
       
       return res
       .status(200)
       .cookie("accessToken" , accessToken , option)
       .cookie("newRefreshToken", newRefreshToken , option)
       .json(new ApiResponse(200 , {
          accessToken : accessToken,
          refreshToken  :newRefreshToken
       },
    "Access Token refreshed Successfully"
    ))
  } catch (error) {
      throw new ApiError(401 , error?.message || "invalid refresh token")
  }



})

const changeCurrentPassword = asyncHandler(async (req ,res)=> {
      const {oldPassword , newPassword} = req.body
      const user = await User.findById(req.user?._id)
      
      const isPasswordcorrection = await user.isPasswordCorrect(oldPassword)
      if(!isPasswordcorrection){
            throw new ApiError(400 , "given password is not correct" )
      }
      user.password = newPassword
   await user.save({validateBeforeSave:false})
      return res
      .status(200)
      .json(new ApiResponse(200 , {} , "password correction successful"))

      
})

const currentUser = asyncHandler(async(req , res)=>{
     return res.status(200).json(new ApiResponse(200 , req.user , "your current user is here"));
})

const updateAccountdetails= asyncHandler(async(req ,res)=>{
      const {fullname , email} = req.body

      if(!(fullname || email)){
            throw new ApiError(401 , "invalid fullNname or email")
      }

      const user = User.findByIdAndUpdate(req.user?._id,{
            $set:{
                  fullname : fullname,
                  email:email
            },
            
      },{new:true}
).select("-password")
return res
.status(200)
.json(new ApiResponse(200 , user , "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async (req ,res)=>{
      const avatarLocalPath = req.file?.path
      if(!avatarLocalPath){
            throw new ApiError(400 , "Avatar file is missing")
      }

      const avatar = await uploadOnCloudinary(avatarLocalPath)
      if(!avatar.url){
            throw new ApiError(401 , "error while genrating avatar URL")
      }
      const user = await User.findByIdAndUpdate(req.user?._id,{
            $set:{
                  avatar : avatar.url,
            }
      },{new:true}).select("-password")
      return res.status(200)
      .json(new ApiResponse(200 , user , "avatar updation successful"))
})


const updateUserCoverImage = asyncHandler(async(req ,res)=>{
      const coverImageLocalPath= req.file?.path
      if(!coverImageLocalPath){
            throw new ApiError(400 , "Cover image file is missing")
      }

      const coverImage = await uploadOnCloudinary(coverImageLocalPath)
      const user = await User.findByIdAndUpdate(req.user?._id,
            {
                  $set:{coverImage : coverImage.url}
      },
      {new:true}).select("-password")

      return res
.status(200)
.json(new ApiResponse(200, user , "cover Image Updation successful"));

})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
      const {username} = req.params;
      if(!username?.trime()){
            throw new ApiError(400, "Username is missing")
      }
      
      const channel =  await User.aggregate([
            {
                  $match:{
                        username : username?.toLowerCase(), 
                  }
            },
            {
                  $lookup:{
                        from:"subscriptions",
                        localField:"_id",
                        foreignField:"channel",
                        as:"subscribers"
                  }
            },
            {
                 $lookup:{
                   from:"subscriptions",
                  localField:"_id",
                  foreignField:"subscriber",
                  as:"subscriberdTo"
                 } 
            },
            {
               $addFields:{
                  subscribersCount :{
                        $size:"$subscribers",
                  },
                  channelIsSubscribedToCount:{
                        $size:"$subscriberdTo"
                  },
                  isSubscribed:{
                        $cond:{
                              if:{
                                    $in:[req.user?._id,"$subscribers.subscriber"]
                              },
                              then:true,
                              else:false,
                        }
                  }
               }     
            },
            {
                  $project:{
                        fullname:1,
                        username:1,
                        subscribersCount:1,
                        channelIsSubscribedToCount:1,
                        isSubscribed:1,
                        avatar:1,
                        coverImage:1,
                        email:1,
                        

                  }
            }
      ])
      console.log("channel", channel);

      if(!channel?.length){
            throw new ApiError(404 , "Channel does not exists")
      }

      return res.status(200)
      .json(
            new ApiResponse(200,channel[0],"user channel fetched sucessfully") 
      )


})

const  getWatchHistory = asyncHandler(async(req , res)=>{
   const user = await User.aggregate([
      {
            $match:{
                  _id:new mongoose.Types.ObjectId(req.user._id),
            }
      },
      {
            $lookup:{
                  from:"videos",
                  localField:"watchHistory",
                  foreignField:"_id",
                  as:"watchHistory",
                  pipeline:[
                        {
                              $lookup:{
                                    from:"users",
                                    localField:"owner",
                                    foreignField:"_id",
                                    as:"owner",
                                    pipeline:[
                                          {
                                                $project:{
                                                 fullname:1,
                                                 username:1,
                                                 avatar:1,     
                                                }
                                          }
                                    ]

                              }
                        },
                        {
                              $addFields:{
                                 owner:{
                                    $frist:"$owner" // for front end ,nahi to extra loop lgana padhe ga
                                 
                                 }   
                              }
                        }
                  ]
            }
      }
   ])

   return res
   .status(200)
   .json(
      new ApiResponse(200,user[0].watchHistory,"Watch histroy Fetched successfully")
   )

})

export {
      registerUser,
      loginUser,
      logoutUser,
      refreshAccessToken,
      changeCurrentPassword,
      currentUser,
      updateAccountdetails,
      updateUserAvatar,
      updateUserCoverImage,
      getUserChannelProfile, 
      getWatchHistory,  

}