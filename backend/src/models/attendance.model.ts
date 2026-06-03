import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true
    },

    timestamp: {
      type: String,
      required: true
    },

    latitude: Number,

    longitude: Number
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "Attendance",
  attendanceSchema
);