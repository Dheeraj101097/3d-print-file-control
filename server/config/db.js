import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let bucket;

export const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  // Use a named bucket "printfiles" so Atlas shows:
  //   printfiles.files   ← file metadata (name, size, uploadDate, contentHash)
  //   printfiles.chunks  ← actual binary data
  bucket = new GridFSBucket(conn.connection.db, { bucketName: 'printfiles' });
  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn;
};

export const getGridFSBucket = () => {
  if (!bucket) throw new Error('GridFS not initialized — call connectDB first');
  return bucket;
};
