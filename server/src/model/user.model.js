import mongoose, {Schema} from 'mongoose'
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new Schema(
    {
        email:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,    
            index:true
        },
        username:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },
        fullName:{
            type: String,
            required: true,
            trim: true
        },
        password:{
            type: String,
            required: true
        },
        avatar:{
            type: String
        },
        refreshToken:{
            type: String
        }
    },
    {
        timestamps:true
    });

userSchema.pre('save',async function(next){
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.method('isValidPassword',async function(password){
    return await bcrypt.compare(password, this.password);
})

userSchema.method('generateAccessToken',function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            fullName: this.fullName,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '1d'
        }
    )
})

userSchema.method('generateRefreshToken',function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '10d'
        }
    )
})

export const User = mongoose.model("User",userSchema);