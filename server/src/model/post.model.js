import mongoose,{Schema} from 'mongoose'

const postSchema = new Schema(
    {
        title:{
            type: String,
            required: true,
            trim: true
        },
        content:{
            type: String,
            required: true
        },
        author:{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        tags:{
            type: [String],
            default: []
        },
        coverImage:{
            type: String
        }
    },
    {
        timestamps:true
    }
)

export const Post = mongoose.model("Post",postSchema)