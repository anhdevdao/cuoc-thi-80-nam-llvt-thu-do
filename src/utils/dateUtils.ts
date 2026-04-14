export const getSystemDate = (): Date => {
  const mockDate = process.env.NEXT_PUBLIC_MOCK_DATE?.trim();

  if (mockDate) {
    const parsedDate = new Date(mockDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      const realNow = new Date();
      parsedDate.setHours(
        realNow.getHours(),
        realNow.getMinutes(),
        realNow.getSeconds(),
        realNow.getMilliseconds(),
      );
      return parsedDate;
    }
  }

  return new Date();
};
