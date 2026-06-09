import { useState } from "react";

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  return {
    page: clampedPage,
    totalPages,
    paginatedItems: items.slice(
      (clampedPage - 1) * pageSize,
      clampedPage * pageSize,
    ),
    prevPage: () => {
      setPage((p) => Math.max(1, p - 1));
    },
    nextPage: () => {
      setPage((p) => Math.min(totalPages, p + 1));
    },
    resetPage: () => {
      setPage(1);
    },
  };
}
