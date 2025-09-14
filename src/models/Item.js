import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Item = mongoose.model("Item", itemSchema);


