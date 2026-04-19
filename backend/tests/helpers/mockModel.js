import { jest } from "@jest/globals";

export const createQueryResult = (value) => {
  const chain = {
    select: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    populate: jest.fn(() => chain),
    exec: jest.fn(async () => value),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
    catch: (reject) => Promise.resolve(value).catch(reject),
  };

  return chain;
};

export const createSaveable = (seed = {}) => {
  const doc = {
    ...seed,
    save: jest.fn(async function save() {
      return this;
    }),
  };

  return doc;
};
