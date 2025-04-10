import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/Api_Response.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)

       const accessToken =  user.generateAccessToken()
       const refreshToken =  user.generateRefreshToken()

       user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})

      return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access token")
    }
}
const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    //validation - not empty
    // check if user already exists: username, email
   // check for images, check  for avatar
   // upload them to cloudinary , avatar
   //create user object -- create entry in db
   // remove password and refresh token field from response
   // check for user creation 
   //return res
   
   // 1 get user details from frontend

   const {fullName, email, username, password} = req.body
   console.log("email" , email);

   // 2 validation 

    // method 1 --- ek ek krke check krna
//    if(fullName === "") {
//     throw new ApiError(400, "fullname is required")
//    }

// method 2
  
if (
    [fullName, email, username, password].some((field) => field?.trim()=== "")
) {
    throw new ApiError(400, "all fiels are required")
}

    // 3 check if user already exists: username, email

   const existedUseer =  await User.findOne({
        $or: [{username}, {email}]
    })
 
    if (existedUseer) {
        throw new ApiError(409, "User with email or username aleady exists")
    }
   
    // 4 check for images, check  for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required ")
    }

    // 5 upload them to cloudinary , avatar
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
         throw new ApiError(400, "Avatar file is required")
    }
   
    // 6 create user object -- create entry in db

   const user =  await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase() 
    })
     
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user")
    }

    return res.status(201).json(
        new  ApiResponse(200, createdUser, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res)=> {
     
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {email, username, password} = req.body
    console.log(email);

    if(!username || !email) {
    if(!username && !email) {    
        throw new ApiError(400, "username or email is required")
    }
}

  const user =  await User.findOne({
        $or: [{username}, {email}]
    })
    
    if(!user) {
        throw new ApiError(404, "User does not exist")
    }
  
     const isPasswordValid =  await user.isPasswordCorrect(password)
     
     if(!isPasswordValid) {
        throw new ApiError(401, "invalid user credentials")
    }

  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
  
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }
  
  return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken,
            refreshToken
        },
        "User logged in Successfully"
    )
  )
})

const logoutUser = asyncHandler(async(req,res)=> {
      await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
      )

      const options = {
        httpOnly: true,
        secure: true
      }
      return res
      .status(200)
      .clearCookie("accessToken", options )
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(incommingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

 try {
    const decodedToken =  jwt.verify(
           incommingRefreshToken,
           process.env.REFRESH_TOKEN_SECRET
       )
   
       const user = await User.findById(decodedToken?._id)
   
       if(!user) {
           throw new ApiError(401, "Invalid refresh token")
       }
       if (incommingRefreshToken !== user?.refreshToken) {
           throw new ApiError(401, "Refresh token is expired or used")
       }
   
       const options = {
           httpOnly: true,
           secure: true
       }
   
       const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
   
       return res
       .status(200)
       .cookie("accessToken", accessToken, options)
       .cookie("refreshToken",newrefreshToken, options)
       .json(
           new ApiResponse(
               200,
               {accessToken, refreshToken: newrefreshToken},
               "Access token refreshed"
           )
       )
 } catch (error) {
    throw new ApiError(401, error?.message || "invalid refresh token")
 }
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}