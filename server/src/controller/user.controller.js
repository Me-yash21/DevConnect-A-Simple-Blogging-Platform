import { User } from '../model/user.model';
import { asyncHandler } from '../utils/asynHandler.js'
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken';

async function generateAccessAndRefreshToken(_id){
    try {
        const user = await User.findById(_id);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave:false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating the access and refresh Token")
    }
}

const options = {
    httpOnly: true,
    secure: true
}
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

const loginUser = asyncHandler(async(req, res)=>{

    const {username, email, password} = req.body;

    if((!username && !email) || !password ){
        const errorInstance = (!password) ? (new ApiError(400,"Password is required")) : (new ApiError(400,"username or email is required"));

        throw errorInstance;
    }

    //match email with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email)){
        throw new ApiError(400,"Email is not valid.")
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    }).select("-password -refreshToken")

    if(!user){
        throw new ApiError(404,"User does not exist.")
    }

    //now validate the password
    const isPasswordValid = await user.isValidPassword(password);
    
    if(!isPasswordValid){
        throw new ApiError("invaild user credentials.")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user,
                accessToken,
                refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req, res)=>{
    //so first it is secure route.
    // so first find out the user based on from its id 
    // clear the refresh token from its document
    // and clear the cookie.

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset:{
                refreshToken: 1 //unset the refresh token in user document
            }
        },
        {
            new: true
        }
    )

    return res
    .status(202)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(202,{},"User logged out successfully"))

})

const getCurrentUser = asyncHandler(async(req, res)=>{
    const user = await User.findById(req.user._id).select("-password -refreshToken");

    return res
    .status(200)
    .json(
        new ApiResponse(200,{
            user
        })
    )
})

const refreshAccessToken = asyncHandler(async(req, res)=>{

    const incomingRefreshToken = req.cookies?.refreshToken || req.headers["Authorization"]?.replace("Baerer ","");

    if(!incomingRefreshToken){
        throw new ApiError(400,"Unauthorized Request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken._id)

        if(!user){
            throw new ApiError(400,"invalid refresh token")
        }

        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(400,"refresh token expired or used.")
        }

        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    user:loggedInUser,
                    accessToken,
                    refreshToken
                },
                "Access Token refreshed successfully"
            )
        )

    } catch (error) {
        throw new ApiError(400, error?.message || "Invalid refresh token")
    }
})
export { 
    registerUser, 
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshAccessToken
 }