import mongoose, { Schema, Document } from 'mongoose';

export interface IResourceFile {
  key: string;        // S3/B2 object key
  fileName: string;   // Original file name
  fileSize: number;   // Size in bytes
  mimeType: string;
  uploadedBy: string; // User ID
  uploadedAt: Date;
}

export interface IResourceSection extends Document {
  classId: string;
  name: string;       // e.g. "Exercices", "Cours", "Résumé"
  createdBy: string;  // User ID
  files: IResourceFile[];
  createdAt: Date;
  updatedAt: Date;
}

const ResourceFileSchema = new Schema<IResourceFile>(
  {
    key: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ResourceSectionSchema = new Schema<IResourceSection>(
  {
    classId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    createdBy: { type: String, required: true },
    files: [ResourceFileSchema],
  },
  { timestamps: true }
);

// Compound index for efficient queries
ResourceSectionSchema.index({ classId: 1, name: 1 });

export default mongoose.models.ResourceSection ||
  mongoose.model<IResourceSection>('ResourceSection', ResourceSectionSchema);
