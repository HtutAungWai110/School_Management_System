import { NextRequest, NextResponse } from "next/server";
import { StudentsService } from "@/services/students/services";
import { handleError } from "@/lib/errors/error.handler";

export class StudentController {
  static async list(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const search = params.get("search") ?? "";
    const filter = params.get("filter") ?? "";

    try {
      const result = await StudentsService.list(search, filter, page);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getOverview() {
    try {
      const { coursesEnrolledCount, assignedBatches, timetableData } = await StudentsService.getStudentOverview()
      return NextResponse.json({ coursesEnrolledCount, assignedBatches, timetableData })
    } catch (error) {
      return handleError(error);
    }
  }

  static async getEnrollments() {
    try {
      const {enrollments} = await StudentsService.getEnrollments()
      return NextResponse.json({enrollments})
    } catch (error) {
      return handleError(error);
    }
  }

  static async createEnrollments(request: NextRequest) {
    try {
      const body = await request.json()
      const { enrollmentResults } = await StudentsService.createEnrollment(body)
      return NextResponse.json({ enrollmentResults })
    } catch (error) {
      return handleError(error);
    }
  }

  static async getTimetables() {
    try {
      const data = await StudentsService.getTimetables()
      return NextResponse.json(data)
    } catch (error) {
      return handleError(error);
    }
  }
}
