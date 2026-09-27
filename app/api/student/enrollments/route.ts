import { StudentController } from "@/controllers/students/student.controllers";


export async function GET() {
  return StudentController.getEnrollments();
}
