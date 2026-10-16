import { NextRequest } from "next/server";
import { StudentController } from "@/controllers/students/student.controllers";

/** Timetables for the signed-in student's own batches.
 *  Accepts ?id= repeated, so a swap notification can point at both sessions. */
export async function GET(request: NextRequest) {
  return StudentController.getTimetables(request)
}