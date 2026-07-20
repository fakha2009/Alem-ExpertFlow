import assert from "node:assert/strict";
import test from "node:test";
import { SAME_ORIGIN_HEADER, SAME_ORIGIN_HEADER_VALUE } from "@/lib/api-client";
import { isSameOriginMutation } from "@/lib/request-security";

function mutation(headers: Record<string, string>) {
  return new Request("https://app.example.com/api/requests", {
    method: "POST",
    headers
  });
}

test("same-origin mutation with the application marker is accepted", () => {
  assert.equal(isSameOriginMutation(mutation({
    [SAME_ORIGIN_HEADER]: SAME_ORIGIN_HEADER_VALUE,
    origin: "https://app.example.com",
    "sec-fetch-site": "same-origin"
  })), true);
});

test("cross-site and unmarked mutations are rejected", () => {
  assert.equal(isSameOriginMutation(mutation({
    [SAME_ORIGIN_HEADER]: SAME_ORIGIN_HEADER_VALUE,
    origin: "https://evil.example",
    "sec-fetch-site": "cross-site"
  })), false);
  assert.equal(isSameOriginMutation(mutation({ origin: "https://app.example.com" })), false);
});

test("safe methods do not require a mutation marker", () => {
  assert.equal(isSameOriginMutation(new Request("https://app.example.com/api/requests")), true);
});
