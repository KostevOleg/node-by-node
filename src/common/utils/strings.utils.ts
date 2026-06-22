export const isNonEmptyString = (str: string) => {
  return str.trim().length > 0;
};

export const normalizeEmail = (str: string) => {
  return str.trim().toLowerCase();
};
