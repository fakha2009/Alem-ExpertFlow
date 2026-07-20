import "server-only";

import { z } from "zod";
import { isSameOriginMutation } from "@/lib/request-security";

export const uuidParamSchema = z.string().uuid();

function namedError(name: string) {
  const error = new Error(name);
  error.name = name;
  return error;
}

async function readBoundedBody(request: Request, maxBytes: number) {
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let body = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maxBytes) {
        await reader.cancel();
        throw namedError("PayloadTooLargeError");
      }

      body += decoder.decode(value, { stream: true });
    }

    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

export function assertSameOriginMutation(request: Request) {
  if (!isSameOriginMutation(request)) {
    throw namedError("CsrfError");
  }
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  maxBytes = 64 * 1024
): Promise<z.output<TSchema>> {
  assertSameOriginMutation(request);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw namedError("UnsupportedMediaTypeError");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw namedError("PayloadTooLargeError");
  }

  const body = await readBoundedBody(request, maxBytes);

  try {
    return schema.parse(JSON.parse(body));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw namedError("BadRequestError");
    }
    throw error;
  }
}
