import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_secret:process.env.CLOUDINARY_API_SECRET,
    api_key:process.env.CLOUDINARY_API_KEY
})

const uploadOnCloudinary = async (localFilePath)=>{
    try {
        if(!localFilePath) return null
        
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:'auto'
        })
        //file has been uploaded successfully
     
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)  // remove the locally saved temporary file as the upload operation got failed
        return null ;
    }
}

const deleteFromCloudiary = async(fileURL)=>{
   try {
    if(!fileURL) return null;
    //here I am extract file Id (publicId of file) from fileURL of cloudinary, because we need public Id to delete or destroy that file.
     
    const fileId = fileURL.replace(`http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`,"").substring(25,45)
    const resource_type = fileURL.replace(`http://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`,"").substring(0,5);
    console.log("fileId :-",fileId)
    console.log("resourse type: ",resource_type)
    
    //delete file from cloudinary
    const response = await cloudinary.uploader.destroy(fileId,{resource_type})
    // console.log("response of delete file from cloudinary:=>",response)
    //{ result: 'ok'}
    if(response.result !== "ok"){
        return false
    }
    return true;
   } catch (error) {
        return false
   }
}

export { uploadOnCloudinary, deleteFromCloudiary }