import { DesighBrief, Generation } from '../models/logoapp'
import clientPromise from './mongodb';

require('dotenv').config();

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function saveGenerations(textAsstes: DesighBrief, logos: string[], product: string, phone: string) {

  if (!process.env.MONGO_DB) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }
	if (!process.env.MONGO_COLLECTION) {
    throw new Error('Invalid environment variable: "MONGO_COLLECTION"');
  }

  const { companyName, domains, slogan, tagline, whyLogo, logoPrompt } = textAsstes

  try {
    const mongoClient = await clientPromise;
		const db = mongoClient.db(process.env.MONGO_DB);
		const collection = db.collection(process.env.MONGO_COLLECTION);

    let urlsImgCloudinary: string[] = [];
		try {
			urlsImgCloudinary = await Promise.all(await logos.map(async (ulr: any) => {
				const uploadedImage = await cloudinary.uploader.upload(ulr, {
					folder: 'logoChain'
				});
				return uploadedImage.secure_url;
			}));
		} catch (error: any) {
			console.error('saveGenerations#cloudinary', error);
			return error.message
		}

    const generation: Generation = {
			createdDate: Date.now(),
			images: urlsImgCloudinary,
      product: product,
			designBrief: {
        companyName,
        domains,
        slogan,
        tagline,
        whyLogo,
        logoPrompt
      }
		}

    console.log('saveG, phone: ', typeof phone, phone)

    const results = await collection.updateOne({ phone: phone },
			{
				$push: {
					generation: generation
				}
			}
		)

    if (results['modifiedCount'] === 0) {
			return { message: 'User not found', type: "Internal server error" };
		}

    return { message: 'Generation saved successfully', type: "Success" };
  } catch (error: any) {
    return { message: error.message, type: "Internal server error" };
  }
}