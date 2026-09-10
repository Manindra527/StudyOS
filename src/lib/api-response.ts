export type ApiError = {
  code: string;
  message: string;
};

export function jsonSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status });
}

export function jsonFailure(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message } satisfies ApiError },
    { status },
  );
}