interface MockQueryBuilder {
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  leftJoin: jest.Mock;
  innerJoin: jest.Mock;
  groupBy: jest.Mock;
  having: jest.Mock;
  execute: jest.Mock;
}

export function createMockQueryBuilder(returnValue: unknown = []): MockQueryBuilder {
  const mock: MockQueryBuilder = {
    select: jest.fn(),
    from: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn(),
    leftJoin: jest.fn(),
    innerJoin: jest.fn(),
    groupBy: jest.fn(),
    having: jest.fn(),
    execute: jest.fn(),
  };

  mock.select.mockReturnValue(mock);
  mock.from.mockReturnValue(mock);
  mock.where.mockReturnValue(mock);
  mock.orderBy.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.offset.mockReturnValue(mock);
  mock.leftJoin.mockReturnValue(mock);
  mock.innerJoin.mockReturnValue(mock);
  mock.groupBy.mockReturnValue(mock);
  mock.having.mockReturnValue(mock);
  mock.execute.mockResolvedValue(returnValue);

  Object.defineProperty(mock, 'then', {
    value: function (onFulfilled: (value: unknown) => unknown) {
      return Promise.resolve(returnValue).then(onFulfilled);
    },
    enumerable: false,
  });

  return mock;
}

export function createMockDb(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    select: jest.fn().mockReturnValue(createMockQueryBuilder()),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
        execute: jest.fn().mockResolvedValue({ rowCount: 0 }),
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
          execute: jest.fn().mockResolvedValue({ rowCount: 0 }),
        }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([]),
        execute: jest.fn().mockResolvedValue({ rowCount: 0 }),
      }),
    }),
    transaction: jest.fn().mockImplementation(async (callback) => {
      return callback({} as never);
    }),
    ...overrides,
  };
}

export function mockDbQuery(mockDb: Record<string, unknown>, returnValue: unknown): void {
  const queryBuilder = createMockQueryBuilder(returnValue);
  (mockDb.select as jest.Mock).mockReturnValue(queryBuilder);
}

export function mockDbInsert(
  mockDb: Record<string, unknown>,
  returnValue: unknown
): void {
  (mockDb.insert as jest.Mock).mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returnValue),
      execute: jest.fn().mockResolvedValue({ rowCount: Array.isArray(returnValue) ? returnValue.length : 1 }),
    }),
  });
}

export function mockDbUpdate(
  mockDb: Record<string, unknown>,
  returnValue: unknown
): void {
  (mockDb.update as jest.Mock).mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue(returnValue),
        execute: jest.fn().mockResolvedValue({ rowCount: Array.isArray(returnValue) ? returnValue.length : 1 }),
      }),
    }),
  });
}

export function mockDbDelete(
  mockDb: Record<string, unknown>,
  returnValue: unknown
): void {
  (mockDb.delete as jest.Mock).mockReturnValue({
    where: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue(returnValue),
      execute: jest.fn().mockResolvedValue({ rowCount: Array.isArray(returnValue) ? returnValue.length : 1 }),
    }),
  });
}

export function mockTransaction<T>(
  mockDb: Record<string, unknown>,
  customImplementation?: (callback: (tx: Record<string, unknown>) => Promise<T>) => Promise<T>
): void {
  if (customImplementation) {
    (mockDb.transaction as jest.Mock).mockImplementation(customImplementation);
  } else {
    (mockDb.transaction as jest.Mock).mockImplementation(async (callback) => {
      const txMock = createMockDb();
      return callback(txMock);
    });
  }
}