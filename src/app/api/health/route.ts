export function GET() {
  return Response.json({
    status: "ok",
    service: "parkinson-project",
    timestamp: new Date().toISOString(),
  });
}
