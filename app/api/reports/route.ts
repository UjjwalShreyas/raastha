import { NextRequest, NextResponse } from "next/server";
import { getGlobalIssues, addOrClusterIssue } from "@/lib/serverStore";
import { HazardIssue } from "@/lib/mockData";

export async function GET() {
  try {
    const issues = await getGlobalIssues();

    const highPriorityCount = issues.filter(
      (i) => i.status !== "Resolved" && i.severity >= 4
    ).length;

    const overdueCount = issues.filter(
      (i) => i.status !== "Resolved" && i.slaMinutesRemaining < 0
    ).length;

    const totalExposure = issues.reduce((sum, i) => sum + i.exposureCount, 0);

    return NextResponse.json({
      success: true,
      issues,
      stats: {
        total: issues.length,
        highPriorityCount,
        overdueCount,
        totalExposure,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch reports." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { issue } = body as { issue: HazardIssue };

    if (!issue || !issue.location || !issue.title) {
      return NextResponse.json(
        { success: false, error: "Invalid hazard report payload." },
        { status: 400 }
      );
    }

    const result = await addOrClusterIssue(issue);

    return NextResponse.json({
      success: true,
      issue: result.issue,
      wasClustered: result.wasClustered,
      message: result.wasClustered
        ? "Report matched an existing active hazard within 30m and was clustered."
        : "New distinct hazard report registered.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save hazard report." },
      { status: 500 }
    );
  }
}
