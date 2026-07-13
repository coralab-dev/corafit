import { describe, expect, it, vi } from "vitest";
import { fetchAllPages } from "./pagination";

describe("fetchAllPages", () => {
  it("keeps query filters and reads all pages until total is reached", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "one" }], limit: 1, page: 1, total: 2 })
      .mockResolvedValueOnce({ items: [{ id: "two" }], limit: 1, page: 2, total: 2 });

    await expect(
      fetchAllPages({
        fetchPage,
        pageSize: 1,
        params: new URLSearchParams({ search: "fuerza", status: "active" }),
      }),
    ).resolves.toEqual([{ id: "one" }, { id: "two" }]);

    expect(fetchPage).toHaveBeenNthCalledWith(
      1,
      new URLSearchParams("search=fuerza&status=active&page=1&limit=1"),
    );
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      new URLSearchParams("search=fuerza&status=active&page=2&limit=1"),
    );
  });

  it("propagates errors from later pages", async () => {
    const failure = new Error("page two failed");
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "one" }], limit: 1, page: 1, total: 2 })
      .mockRejectedValueOnce(failure);

    await expect(
      fetchAllPages({ fetchPage, pageSize: 1 }),
    ).rejects.toThrow(failure);
  });

  it("stops instead of cycling when metadata is inconsistent", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: [{ id: "one" }], limit: 1, page: 1, total: 3 })
      .mockResolvedValueOnce({ items: [], limit: 1, page: 2, total: 3 });

    await expect(
      fetchAllPages({ fetchPage, pageSize: 1 }),
    ).rejects.toThrow("Paginated response did not advance");
  });
});
