export type PaginatedResponse<T> = {
  items: T[];
  limit?: number;
  page?: number;
  total: number;
};

export async function fetchAllPages<T>({
  fetchPage,
  pageSize = 50,
  params = new URLSearchParams(),
}: {
  fetchPage: (params: URLSearchParams) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
  params?: URLSearchParams;
}): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  while (true) {
    const pageParams = new URLSearchParams(params);
    pageParams.set("page", String(page));
    pageParams.set("limit", String(pageSize));

    const response = await fetchPage(pageParams);
    const responseItems = response.items;
    const responseTotal = response.total;

    if (!Number.isFinite(responseTotal) || responseTotal < 0) {
      throw new Error("Paginated response total is invalid");
    }

    if (!responseItems.length && items.length < responseTotal) {
      throw new Error("Paginated response did not advance");
    }

    items.push(...responseItems);

    if (items.length >= responseTotal) {
      return items;
    }

    const responsePage = response.page ?? page;
    if (responsePage < page) {
      throw new Error("Paginated response page moved backwards");
    }

    page += 1;
  }
}
