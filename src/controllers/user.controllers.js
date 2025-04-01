import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/Api_Response.js";

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

   const existedUseer =  User.findOne({
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

export {registerUser}