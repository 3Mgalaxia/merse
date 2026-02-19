import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint not implemented yet." },
    { status: 501 },
  );
}
