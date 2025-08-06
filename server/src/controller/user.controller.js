import { User } from '../model/user.model';
import { asyncHandler } from '../utils/asynHandler.js'
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'


const registerUser = asyncHandler(async(req, res)=>{

    const {fullName, email, password, username} = req.body;

    if([fullName, email, password, username].some((field)=>field.trim() === "")){
        throw new ApiError(400,"All fields are required to register a user")
    }

    //match email with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)){
        throw new ApiError(400,"Email is not valid.")
    }

    // check for existing user
    const existingUser = await User.findOne({
        $or:[{email},{username}]
    })

    if(existingUser){
        if(existingUser.email == email){
            throw new ApiError(400,"This email is  already registered.")
        }
        if(existingUser.username == username){
            throw new ApiError(400,"This username is not available.")
        }
    }

    //upload the avatar in cloudinary
    const avatarLocalFilePath = req?.file || "public\\temp\\user-avatar.png"
    if(!avatarLocalFilePath){
        throw new ApiError(400,"avatar is requird to register the user.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalFilePath);

    if(!avatar){
        throw new ApiError(400, "something went wrong while uploading the avatar file.")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.secure_url
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }

     return res.status(201).json(
        new ApiResponse(200,createdUser, "User registered successfully")
     )
})

export { registerUser }