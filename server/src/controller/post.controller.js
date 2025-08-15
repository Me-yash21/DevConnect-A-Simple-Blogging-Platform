import { Post } from '../model/post.model.js'
import {ApiError} from '../utils/ApiError.js'
import {ApiResponse} from '../utils/ApiResponse.js'
import {asyncHandler} from '../utils/asynHandler.js'
import {uploadOnCloudinary, deleteFromCloudiary} from '../utils/cloudinary.js'

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

const getPostById = asyncHandler(async(req,res)=>{

    const {id} = req.params ;
    if(!id){
        throw new ApiError(400,"video Id is required.")
    }

    const post = await Post.aggregate([
        {
            $match: {
                _id: id
            }
        },
        {
            $lookup:{
                from:'users',
                localField:'author',
                foreignField:'_id',
                pipeline:[
                    {
                        $project:{
                            fullName:1,
                            username:1,
                            avatar:1
                        }
                    }
                ],
                as:'author_detail'
            }
        },
        {
            $lookup:{
                from:'likes',
                localField:'_id',
                foreignField:'postId',
                as:"likes"
            }
        },
        {
            $addFields:{
                likeUsersId:{
                    $map:{
                        input:'$likes',
                        as:'like',
                        in:{
                            $toString: "$$like.userId"
                        }
                    }
                }
            }
        },
        {
            $addFields:{
                likesCount:{
                    $size:'$likes'
                },
                isLiked:{
                    $cond:{
                        if:{$in:[req.user?._id,likeUsersId]},
                        then: true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                title: 1,
                content: 1,
                author_detail: 1,
                tags: 1,
                coverImage: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ])

    if(!post){
        throw new ApiError(404,"invaild post id , post not found.")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,
        post,
        "post fetched successfully."
    ))
})

const updatePost = asyncHandler(async(req, res)=>{

    const {id} = req.params;
    if(!id){
        throw new ApiError(400,"Post Id is required.")
    }

    const title = req.body.title?.trim();
    const content = req.body.content?.trim();
    const tags = JSON.parse(req.body.tags);
    
    const coverImageLocalPath = req.file;
  
    //* check that at least one field is valid or not empty or not undefined
    if(!title && !content && !coverImageLocalPath && !(tags?.toString())){
        throw new ApiError(400,"At least one field is required")
    }

    //function to upload new cover image and delete previous coverImage on cloudinary.
    async function updateCoverImageOnCloudinary(coverImageLocalPath,previousCoverImageUrl){
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);

        if(!coverImage){
            throw new ApiError(500,"something went wrong while uploading the file.")
        }

        const deleteCoverImage = await deleteFromCloudiary(previousCoverImageUrl);

        return coverImage;
    }

    if(title || content || tags.length){
        const post = await Post.findByIdAndUpdate(id,
            {
                $set:{
                    title,
                    content,
                    tags
                }
            },
            {
                new:true
            }
        )

        if(!post){
            throw new ApiError(400,"Post Id is invaild.")
        }

        if(coverImageLocalPath){
            //if there is coverImage then delete previous image and updater with new one.
            const newCoverImage = await updateCoverImageOnCloudinary(coverImageLocalPath, post.coverImage);

            post.coverImage = newCoverImage.secure_url;
            await post.save({validateBeforeSave:false});
            // Post.save() return the updated document and also modify the original document. It modifies and returns the same document instance

        }

        return res
        .status(200)
        .json(new ApiResponse(
            200,
            post,
            "post updated successfully."
        ))
    }
    else if(coverImageLocalPath){
        const post = await Post.findById(id);

        if(!post){
            throw new ApiError(400,"Post Id is invalid.")
        }

        const newCoverImage = await updateCoverImageOnCloudinary(coverImageLocalPath,post.coverImage);

        post.coverImage = newCoverImage.secure_url;
        await post.save({validateBeforeSave:false});

        return res
        .status(200)
        .json(new ApiResponse(
            200,
            post,
            "post coverImage updated successfully."
        ))
    }

})


export {
    createPost,
    getAllPost,
    getPostById,
    updatePost
}