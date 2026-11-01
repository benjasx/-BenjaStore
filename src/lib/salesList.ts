export const PAGE_SIZE = 20;

export const paginate = <T>(items: T[], page: number) => {
  const pages = Math.max(Math.ceil(items.length / PAGE_SIZE), 1);
  const current = Math.min(Math.max(page, 1), pages);
  return {
    items: items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    page: current,
    pages,
  };
};
