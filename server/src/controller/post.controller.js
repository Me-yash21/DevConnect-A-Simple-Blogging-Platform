import { Post } from '../model/post.model.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler} from '../utils/asynHandler.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'

const createPost = asyncHandler(async(req, res)=>{

    const {title, content, tags} = req.body;

    if(!title || !content){
        throw new ApiError(400,"Title and content are required ")
    }

    if(!req.user){
        throw new ApiError(400,"Unathorized requred to create a post ")
    }

    const coverImageLocalPath = req.file;

    let coverImage;
    //if coverImage is comming then upload that image on cloudinary 
    if(coverImageLocalPath){
       coverImage = await uploadOnCloudinary(coverImageLocalPath)

        if(!coverImage){
            throw new ApiError(500,"something went worng while uploading the imgae file.")
        }
    }

    const post = await Post.create({
        title,
        content,
        coverImage: coverImage?.secure_url || "",
        author: req.user._id,
        tags: [...tags]
    })

    if(!post){
        throw new ApiError(500,"something went wrong while creating a post")
    }

    return res
    .status(201)
    .json(new ApiResponse(
        201,
        post,
        "Post created successfully"
    ))
})

const getAllPost = asyncHandler(async (req, res)=>{
    
    const {sortBy="createdAt",sortType="desc"} = req.query;
    let {page=1, limit=20 } = req.query;

    //* what if the page and limit value is negative or more than existed pages,handle that edge case
    page = parseInt(page,10);
    limit = parseInt(limit,10);

    const skip  = (page - 1) * limit;
    let sortOptions = {}
    sortOptions[sortBy] = sortType;

    const posts = await Post.find({})
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .populate("author","fullName username")
    .lean()

    const total = await Post.countDocuments();
    const totalPages = Math.ceil(total/limit);
    const hasPreviousPage = (page > 1 && page <= totalPages) ? (true) : (false) 
    const hasNextPage = (page < totalPages) ? (true) : (false)
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        {
            posts,
            hasPreviousPage,
            hasNextPage,
            totalPosts:total,
            page:page,
            limit:limit,
            totalPages,

        },
        "Posts are send successfully"
    ))
})

export {
    createPost,
    getAllPost
}